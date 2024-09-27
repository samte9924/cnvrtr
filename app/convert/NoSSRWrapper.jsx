import dynamic from "next/dynamic";
import React from "react";
const NoSSRWrapper = (props) => (
  <React.Fragment>{props.children}</React.Fragment>
);
export default dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false,
});

/*
  Questo componente è un wrapper nel quale i figli non verranno caricati
  lato server.

  Impostando ssr su 'false', viene disabilitato il rendering del
  componente lato server, evitando così che venga causato un errore
  al caricamento di Wasm, il quale non è compatibile con Node.js.

  GitHub esempio ffmpeg.wasm
  -> https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/apps/nextjs-app
*/
