"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FilePlus2, LoaderCircle, Video, X } from "lucide-react";
import { useRef, useState } from "react";

function Convert() {
  const ffmpegRef = useRef(new FFmpeg());

  const [files, setFiles] = useState(null);
  const [readyFFmpeg, setReadyFFmpeg] = useState(false);
  const [converting, setConverting] = useState(false);
  const [output, setOutput] = useState(null);
  const [name, setName] = useState(null);
  const [size, setSize] = useState(null);

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
      console.log("FFmpeg pronto");
      setReadyFFmpeg(true);
    } catch (error) {
      console.error("Errore nel caricamento di FFmpeg:", error);
    }
  };

  const convertToMP3 = async () => {
    const ffmpeg = ffmpegRef.current;
    setConverting(true);

    try {
      await ffmpeg.writeFile("input.mp4", await fetchFile(files));
      await ffmpeg.exec(["-i", "input.mp4", "output.mp3"]);
      const data = await ffmpeg.readFile("output.mp3");

      const audioBlob = new Blob([data.buffer], { type: "audio/mp3" });
      const audioURL = URL.createObjectURL(audioBlob);
      setOutput(audioURL);
    } catch (error) {
      console.log("Errore durante la conversione:", error);
    }

    setConverting(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    console.log(file.type);
    if (file && file.type.startsWith("video")) {
      setFiles(file);
      setName(file.name);
      setSize(file.size);

      if (!readyFFmpeg) {
        await loadFFmpeg();
      }
    } else {
      alert("Carica un file valido.");
    }
  };

  return (
    <div className="w-full h-screen">
      <div className="max-w-[90%] mx-auto my-20 flex flex-col justify-center items-center">
        <h2 className="text-5xl">Convert file to mp3 without limits</h2>
        <div className="w-full mt-10 p-5">
          {!files && (
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
                  [...e.dataTransfer.items].forEach((item, i) => {
                    if (item.kind === "file") {
                      const file = item.getAsFile();
                      console.log(`file #${i} -> ${file?.type}`);
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
                <FilePlus2 width={50} height={50} />
                <h2 className="text-xl">Click here or drop files to upload.</h2>
              </Label>
            </div>
          )}
          {files && (
            <div className="relative w-full grid grid-cols-3 border p-8 rounded-xl shadow-sm items-center justify-between">
              <span
                className="absolute w-8 h-8 -top-2 -right-2 border rounded-full cursor-pointer flex items-center justify-center bg-white"
                onClick={() => setFiles(null)}
              >
                <X />
              </span>
              <div className="flex items-center col-span-2">
                <h2>{name || "Nome del file aggiunto"}</h2>
                <h4 className="ml-4 text-gray-500 text-sm">
                  {size || "Size"} bytes
                </h4>
                <div className="ml-10">
                  <Video width={30} height={30} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="relative">
                  <span
                    className={`absolute h-3 w-3 -top-1 -left-1 rounded-full ${
                      converting
                        ? "bg-orange-500"
                        : output
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {converting && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    )}
                  </span>
                  <Badge>
                    {converting
                      ? "Conversione..."
                      : output
                      ? "Completato"
                      : "In attesa"}
                  </Badge>
                </div>
                {!output && (
                  <Button
                    onClick={convertToMP3}
                    className="py-5"
                    disabled={converting || !files}
                  >
                    {converting ? (
                      <div className="flex items-center gap-2">
                        <LoaderCircle className="animate-spin" />
                      </div>
                    ) : (
                      "Converti in MP3"
                    )}
                  </Button>
                )}
                {output && (
                  <div>
                    <a href={output} download={"output.mp3"}>
                      <Button>Scarica mp3</Button>
                    </a>
                  </div>
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
