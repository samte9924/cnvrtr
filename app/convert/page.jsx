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
import { useEffect, useRef, useState } from "react";

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

function Page() {
  const ffmpegRef = useRef(new FFmpeg());
  const [readyFFmpeg, setReadyFFmpeg] = useState(false);

  const [output, setOutput] = useState(null);

  const [files, setFiles] = useState([]);
  const [convertedFiles, setConvertedFiles] = useState([]);

  const [areaFocus, setAreaFocus] = useState(false);

  const loadFFmpeg = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });

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
      setReadyFFmpeg(true);
    } catch (error) {
      console.error("Errore nel caricamento di FFmpeg:", error);
    }
  };

  const convertSingleFile = async (file) => {
    const ffmpeg = ffmpegRef.current;

    updateFileConverting(file.id, true);
    try {
      console.log(`${file.name}.${file.extention}`);
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
        type: `${file.type.split("/")[0]}/${file.convertTo.type}`,
      });
      const outputURL = URL.createObjectURL(outputBlob);
      setFileOutput(file.id, outputURL);

      setFileConvertionSuccess(file.id);
    } catch (error) {
      setFileConvertionError(file.id);
      console.log("Errore durante la conversione:", error);
    }

    updateFileConverting(file.id, false);
  };

  const convertFiles = async () => {
    setConvertedFiles([]);

    for (const file in files) {
      try {
        const convertedFile = await convertSingleFile(file);
        setConvertedFiles((prevFiles) => [...prevFiles, convertedFile]);
      } catch (error) {
        console.error(
          "Errore durante la conversione del file: ",
          file.name,
          error
        );
      }
    }
  };

  const handleFileUpload = async (e) => {
    [...e.target.files].forEach((file, index) => generateNewFile(file, index));
  };

  const generateNewFile = async (file, index) => {
    console.log(file);
    let fileName = "";
    for (let i = 0; i < file.name.split(".").length - 1; i++) {
      fileName += file.name.split(".")[i];
    }
    const fileExtention = file.name.split(".")[file.name.split(".").length - 1];
    console.log("nome: " + fileName + "." + fileExtention);

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
    console.log(newFile);

    setFiles((prevFiles) => [...prevFiles, newFile]);

    if (!readyFFmpeg) await loadFFmpeg();
  };

  const calculateSize = (fileSize) => {
    const kb = 1000;
    const mb = 1000000;
    const gb = 1000000000;

    if (fileSize >= kb && fileSize < mb)
      return (fileSize / kb).toFixed(2) + " KB";
    if (fileSize >= mb && fileSize < gb)
      return (fileSize / mb).toFixed(2) + " MB";
    if (fileSize >= gb) return (fileSize / gb).toFixed(2) + " GB";
  };

  const setFileConvertTo = (fileId, convertTo) => {
    const fileIndex = files.findIndex((file) => file.id === fileId);

    if (fileIndex !== -1) {
      const updatedFiles = [...files];

      updatedFiles[fileIndex] = {
        ...updatedFiles[fileIndex],
        convertTo: convertTo,
      };
      setFiles(updatedFiles);
    }
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

  const setFileConvertionSuccess = (fileId) => {
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

  const setFileConvertionError = (fileId) => {
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
        return updatedFiles;
      }
      return prevFiles;
    });
  };

  const removeFileFromList = (fileName) => {
    const newFiles = files.filter((file) => file.name !== fileName);
    setFiles(newFiles);
  };

  useEffect(() => {
    console.log(files);
  }, [files]);

  return (
    <div className="w-full">
      <div className="max-w-[90%] mx-auto my-20 flex flex-col justify-center items-center">
        <h2 className="text-5xl">Convert files without limits</h2>
        <div className="w-full mt-10 p-5">
          {files.length === 0 ? (
            <div
              className="border-2 w-full h-[400px] mx-auto flex items-center justify-center p-3 rounded-3xl shadow-sm"
              onDragOver={(e) => {
                e.preventDefault();
                setAreaFocus(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setAreaFocus(false);
              }}
              onDragEnd={(e) => {
                e.preventDefault();
                setAreaFocus(false);
              }}
              onDrop={(e) => {
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
                    if (item.kind === "file") {
                      const file = item.getAsFile();
                      generateNewFile(file, index);
                    }
                  });
                } else {
                  [...e.dataTransfer.items].forEach((file, i) => {
                    console.log(`file #${i} -> ${file?.type}`);
                  });
                }
              }}
            >
              <Input
                id="uploadArea"
                type={"file"}
                className="hidden"
                onChange={handleFileUpload}
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
                              <LoaderCircle
                                width={20}
                                height={20}
                                className="animate-spin"
                              />
                            </div>
                          ) : (
                            `Converti in ${item.convertTo.name}`
                          )}
                        </Button>
                      ) : (
                        <div>
                          <a
                            href={item.output}
                            download={`${item.name}.${item.convertTo.name}`}
                          >
                            <Button>Scarica</Button>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={convertFiles}>Converti tutti</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Page;
