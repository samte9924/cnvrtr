"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  ChevronDown,
  File,
  FileDown,
  FilePlus2,
  Image,
  LoaderCircle,
  Music,
  Video,
  X,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { useEffect, useRef, useState } from "react";
import localFont from "next/font/local";
import Link from "next/link";

const playwriteDE = localFont({
  src: "../../app/_fonts/PlaywriteDEGrund-Regular.ttf",
  display: "swap",
});

const icons = {
  video: <Video width={30} height={30} />,
  audio: <Music width={30} height={30} />,
  image: <Image width={30} height={30} />,
};

const audioMIMETypes = [
  { type: "mpeg", name: "mp3" },
  { type: "wav", name: "wav" },
  { type: "ogg", name: "ogg" },
  { type: "aac", name: "aac" },
  { type: "flac", name: "flac" },
  { type: "x-ms-wma", name: "wma" },
  { type: "aiff", name: "aiff" },
  { type: "mp4", name: "m4a" },
];

const videoMIMETypes = [
  { type: "mp4", name: "mp4" },
  { type: "mp4v-es", name: "mp4v" },
  { type: "ogg", name: "ogv" },
  { type: "x-msvideo", name: "avi" },
  { type: "3gpp", name: "3gp" },
  { type: "quicktime", name: "mov" },
  { type: "x-flv", name: "flv" },
  { type: "x-matroska", name: "mkv" },
  { type: "x-ms-wmv", name: "wmv" },
];

const imageMIMETypes = [
  { type: "jpeg", name: "jpeg" },
  { type: "png", name: "png" },
  { type: "gif", name: "gif" },
  { type: "bmp", name: "bmp" },
  { type: "webp", name: "webp" },
  { type: "tiff", name: "tiff" },
  { type: "svg+xml", name: "svg" },
  { type: "x-icon", name: "ico" },
  { type: "heif", name: "heif" },
  { type: "avif", name: "avif" },
];

function Convert() {
  const ffmpegRef = useRef(new FFmpeg());

  const [files, setFiles] = useState([]);
  const [areaFocus, setAreaFocus] = useState(false);

  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Ffmpeg viene caricato appena il componente viene montato
  // usando useEffect(), lasciando però l'array di dipendenze vuoto
  // in modo da non fare eseguire il codice ogni volta che qualcosa viene aggiornato.
  useEffect(() => {
    const loadFFmpeg = async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

      const ffmpeg = ffmpegRef.current;
      /* 
      Ogni volta che viene "loggato" qualcosa, lo mostro in console
      (ad esempio mentre viene convertito un file)

      ffmpeg.on("log", ({ message }) => {
        console.log(message);
      });
      */

      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
        });
      } catch (error) {
        console.error("Errore nel caricamento di FFmpeg:", error);
      }
    };

    loadFFmpeg();
  }, []);

  const convertSingleFile = async (file) => {
    // se non è stato scelto il tipo di conversione, annullo
    if (!file.convertTo) return;

    const ffmpeg = ffmpegRef.current;

    updateFileConverting(file.id, true);
    try {
      await ffmpeg.writeFile(
        `${file.name}.${file.extention}`,
        await fetchFile(file.raw)
      );

      await ffmpeg.exec([
        "-i",
        `${file.name}.${file.extention}`,
        `output.${file.convertTo.name}`,
      ]);
      const data = await ffmpeg.readFile(`output.${file.convertTo.name}`);

      const outputBlob = new Blob([data.buffer], {
        type: `${file.type.split("/")[0]}`,
      });
      const outputURL = URL.createObjectURL(outputBlob);
      setFileConversionSuccess(file.id);
      setFileOutput(file.id, outputURL);
    } catch (error) {
      setFileConversionError(file.id);
      console.log("Errore durante la conversione:", error);
    }

    updateFileConverting(file.id, false);
  };

  const convertAllFiles = async () => {
    let completed = true;
    for (const file of files) {
      await convertSingleFile(file);
    }
    setCompleted(completed);
  };

  const checkAllFilesConversionAvailable = (files) => {
    let allFilesReady = true;
    for (const file of files) {
      if (!file.convertTo) {
        allFilesReady = false;
        break;
      }
    }
    setReady(allFilesReady);
  };

  const checkAllFilesConverted = (files) => {
    let allFilesCompleted = true;
    for (const file of files) {
      if (!file.success) {
        allFilesCompleted = false;
        break;
      }
    }
    setCompleted(allFilesCompleted);
  };

  const downloadSingleFile = (file) => {
    if (!file.output) return;

    try {
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = file.output;
      a.download = `${file.name}.${file.convertTo.name}`;

      document.body.appendChild(a);
      a.click();

      // libero la memoria dopo il download
      URL.revokeObjectURL(file.url);
      document.body.removeChild(a);
    } catch (error) {
      console.log("Errore durante il download del file: ", file, error);
    }
  };

  const downloadAllFiles = () => {
    for (const file of files) {
      downloadSingleFile(file);
    }
  };

  // gestisco l'upload dei file quando viene cliccata l'area di upload
  const handleFileUpload = async (e) => {
    [...e.target.files].forEach((file, index) => {
      const mime = file.type.split("/")[0];
      if (mime === "image" || mime === "video" || mime === "audio") {
        generateNewFileObject(file, index);
      }
    });
  };

  // Creo un nuovo oggetto file che copia gli attributi dell'istanza file
  // ottenuta dal file input, e inserisco quest'ultima come attributo che userò
  // per generare l'input per la conversione.
  const generateNewFileObject = async (file, index) => {
    // Il nome effettivo del file comprende tutto ciò prima dell'ultimo "."
    let fileName = "";
    for (let i = 0; i < file.name.split(".").length - 1; i++) {
      fileName += file.name.split(".")[i];
    }
    // L'estensione del file comprende tutto ciò che è dopo l'ultimo "."
    const fileExtention = file.name.split(".")[file.name.split(".").length - 1];

    // Uso index per seguire l'ordine in cui i file vengono inseriti nell'array,
    // converting indica lo stato di conversione del file,
    // originalName è il nome originale dell'istanza File,
    // size è la grandezza in bytes del file,
    // type è il tipo di file (es. image/png)
    // raw è l'istanza File
    const newFile = {
      id: index,
      name: fileName,
      extention: fileExtention,
      converting: false,
      originalName: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      raw: file,
    };

    // Aggiorno i file modificando la versione più recente dell'array
    setFiles((prevFiles) => [...prevFiles, newFile]);

    setReady(false);
    setCompleted(false);
  };

  const calculateSize = (sizeBytes) => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    if (sizeBytes === 0) return "0 Byte";

    // Math.log() ritorna il logaritmo naturale di un numero
    const index = Math.floor(Math.log(sizeBytes) / Math.log(1024));
    const size = (sizeBytes / Math.pow(1024, index)).toFixed(2); // 2 cifre decimali

    return size + " " + sizes[index];
  };

  // imposta il formato in cui verrà convertito il singolo file
  const setFileConvertTo = (fileId, convertTo) => {
    setFiles((prevFiles) => {
      const fileIndex = prevFiles.findIndex((file) => file.id === fileId);

      if (fileIndex !== -1) {
        const updatedFiles = [...prevFiles];

        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          convertTo: convertTo,
        };

        // verifico se tutti i file sono pronti per la conversione
        checkAllFilesConversionAvailable(updatedFiles);

        return updatedFiles;
      }
      return prevFiles;
    });
  };

  const updateFileConverting = (fileId, converting) => {
    setFiles((prevFiles) => {
      const fileIndex = prevFiles.findIndex((file) => file.id === fileId);

      if (fileIndex !== -1) {
        const updatedFiles = [...prevFiles];

        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          converting: converting,
        };
        return updatedFiles;
      }
      return prevFiles;
    });
  };

  const setFileConversionSuccess = (fileId) => {
    setFiles((prevFiles) => {
      const fileIndex = prevFiles.findIndex((file) => file.id === fileId);

      if (fileIndex !== -1) {
        const updatedFiles = [...prevFiles];

        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          success: true,
        };
        return updatedFiles;
      }
      return prevFiles;
    });
  };

  const setFileConversionError = (fileId) => {
    setFiles((prevFiles) => {
      const fileIndex = prevFiles.findIndex((file) => file.id === fileId);

      if (fileIndex !== -1) {
        const updatedFiles = [...prevFiles];

        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          error: true,
        };
        return updatedFiles;
      }
      return prevFiles;
    });
  };

  const setFileOutput = (fileId, output) => {
    setFiles((prevFiles) => {
      const fileIndex = prevFiles.findIndex((file) => file.id === fileId);

      if (fileIndex !== -1) {
        const updatedFiles = [...prevFiles];

        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          output: output,
        };

        checkAllFilesConverted(updatedFiles);
        return updatedFiles;
      }
      return prevFiles;
    });
  };

  const removeFileFromList = (fileName) => {
    const newFiles = files.filter((file) => file.name !== fileName);
    setFiles(newFiles);
  };

  const resetFiles = () => {
    setFiles([]);
  };

  return (
    <div className="w-full">
      <div className="max-w-[90%] mx-auto my-20 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center justify-center gap-5">
          <h2 className={`${playwriteDE.className} text-5xl`}>cnvrtr.io</h2>
          <h3 className="text-lg">
            <span>
              Converti file audio, video e immagini direttamente dal tuo
              browser.{" "}
            </span>
            <Link
              href={"/about"}
              className="text-sky-500 underline hover:text-sky-600"
            >
              Scopri di più
            </Link>
          </h3>
          <div>
            <a href="https://github.com/samte9924/cnvrtr" target="_blank">
              <SiGithub className="w-8 h-8 rounded-full" />
            </a>
          </div>
        </div>
        <div className="w-full mt-10 p-5">
          {files.length === 0 ? (
            <div
              className="border-2 w-full h-[400px] mx-auto flex items-center justify-center p-3 rounded-3xl shadow-sm"
              onDragOver={(e) => {
                // vengono spostati i file sull'area di upload
                e.preventDefault();
                setAreaFocus(true);
              }}
              onDragLeave={(e) => {
                // i file vengono spostati dall'area
                e.preventDefault();
                setAreaFocus(false);
              }}
              onDragEnd={(e) => {
                // viene annullato lo spostamento
                e.preventDefault();
                setAreaFocus(false);
              }}
              onDrop={(e) => {
                // i file vengono rilasciati nell'area
                e.preventDefault();
                setAreaFocus(false);
                if (e.dataTransfer.items) {
                  /*
                    e.dataTransfer.items è un'oggetto iterabile (una collezione di oggetti o 
                    un oggetto contente oggetti).
                    Con lo spread operator [...] espando gli elementi al suo interno dentro un array
                    così da poter usare metodi come forEach, filter o map.
                  */
                  [...e.dataTransfer.items].forEach((item, index) => {
                    // se il file è di tipo "file"
                    if (item.kind === "file") {
                      const file = item.getAsFile();
                      generateNewFileObject(file, index);
                    }
                  });
                }
              }}
            >
              <Input
                id="uploadArea"
                type={"file"}
                className="hidden"
                onChange={handleFileUpload}
                multiple
                accept="image/*, video/*, audio/*"
              />
              <Label
                htmlFor={"uploadArea"}
                className={`flex flex-col gap-5 items-center justify-center rounded-2xl w-full h-full ${
                  areaFocus ? "border border-black border-dashed" : ""
                }`}
              >
                {areaFocus ? (
                  <FileDown width={50} height={50} />
                ) : (
                  <FilePlus2 width={50} height={50} />
                )}
                <h2 className="text-xl">Click here or drop files to upload.</h2>
              </Label>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="relative w-full grid grid-cols-3 border p-10 rounded-xl shadow-sm items-center justify-between"
                >
                  <span
                    className="absolute w-8 h-8 -top-2 -right-2 border rounded-full cursor-pointer flex items-center justify-center bg-white"
                    onClick={() => removeFileFromList(item.name)}
                  >
                    <X />
                  </span>
                  <div className="flex items-center col-span-2">
                    {item.type.split("/")[0] &&
                      (icons[item.type.split("/")[0]] || (
                        <File width={30} height={30} />
                      ))}
                    <h2 className="ml-3">
                      {item.name}.{item.extention}
                    </h2>
                    <h4 className="ml-2 text-gray-500 text-sm">
                      {calculateSize(item.size)}
                    </h4>
                  </div>
                  {!item.convertTo ? (
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            <div className="flex gap-2 items-center">
                              <h2>Converti in</h2>
                              <ChevronDown width={15} height={15} />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <Tabs
                            defaultValue={
                              item.type.split("/")[0] === "image"
                                ? "image"
                                : "video"
                            }
                          >
                            <TabsList className="w-full border">
                              {item.type.split("/")[0] === "video" && (
                                <TabsTrigger value="video" className="w-1/2">
                                  Video
                                </TabsTrigger>
                              )}
                              {(item.type.split("/")[0] === "video" ||
                                item.type.split("/")[0] === "audio") && (
                                <TabsTrigger value="audio" className="w-1/2">
                                  Audio
                                </TabsTrigger>
                              )}
                              {item.type.split("/")[0] === "image" && (
                                <TabsTrigger value="image" className="w-full">
                                  Image
                                </TabsTrigger>
                              )}
                            </TabsList>
                            <TabsContent value="video">
                              <div className="grid grid-cols-4 grid-rows-4 gap-1">
                                {videoMIMETypes.map((mime, index) => (
                                  <div
                                    key={index}
                                    onClick={() =>
                                      setFileConvertTo(item.id, mime)
                                    }
                                    className="cursor-pointer border p-3 flex items-center justify-center hover:bg-gray-200 rounded-lg"
                                  >
                                    .{mime.name}
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="audio">
                              <div className="grid grid-cols-4 grid-rows-4 gap-1">
                                {audioMIMETypes.map((mime, index) => (
                                  <div
                                    key={index}
                                    onClick={() =>
                                      setFileConvertTo(item.id, mime)
                                    }
                                    className="cursor-pointer border p-3 flex items-center justify-center hover:bg-gray-200 rounded-lg"
                                  >
                                    .{mime.name}
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="image">
                              <div className="grid grid-cols-4 grid-rows-4 gap-1">
                                {imageMIMETypes.map((mime, index) => (
                                  <div
                                    key={index}
                                    onClick={() =>
                                      setFileConvertTo(item.id, mime)
                                    }
                                    className="cursor-pointer border p-3 flex items-center justify-center hover:bg-gray-200 rounded-lg"
                                  >
                                    .{mime.name}
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <span
                          className={`absolute h-3 w-3 -top-1 -left-1 rounded-full ${
                            item.converting
                              ? "bg-orange-500"
                              : item.success
                              ? "bg-green-500"
                              : item.error
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }`}
                        >
                          {item.converting && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          )}
                        </span>
                        <Badge>
                          {item.converting
                            ? "Conversione"
                            : item.success
                            ? "Completato"
                            : item.error
                            ? "Errore"
                            : "In attesa"}
                        </Badge>
                      </div>
                      {!item.output ? (
                        <Button
                          onClick={() => convertSingleFile(item)}
                          disabled={
                            item.converting || item.error || item.success
                          }
                        >
                          {item.converting ? (
                            <div className="flex items-center">
                              <LoaderCircle className="animate-spin" />
                            </div>
                          ) : (
                            `Converti in ${item.convertTo.name}`
                          )}
                        </Button>
                      ) : (
                        <Button onClick={() => downloadSingleFile(item)}>
                          Scarica
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="w-full flex items-center justify-end gap-5">
                <Button
                  variant="outline"
                  onClick={resetFiles}
                  className="px-10 py-5"
                >
                  Reset
                </Button>
                {!completed ? (
                  <Button
                    onClick={convertAllFiles}
                    disabled={!ready}
                    className="px-10 py-5"
                  >
                    Converti tutti
                  </Button>
                ) : (
                  <Button onClick={downloadAllFiles} className="px-10 py-5">
                    Scarica tutti
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Convert;
