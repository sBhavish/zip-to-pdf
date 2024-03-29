import React, { useState } from "react";
import { MetaFunction } from "@remix-run/node";
import JSZip from "jszip";
import type { LinksFunction } from "@remix-run/node";
import styles from '~/styles/styles.css?url'
import loadingGif from '~/loading-thinking.gif'
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous"},
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
  },
];
export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const Index = () => {
  const [images, setImages] = useState([]);
  const [loadedImages, setLoadedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const handleFileChange = async (event: any) => {
    setIsLoading(true);
  const file = event.target.files[0];
  if (!file) return;

  try {
    const zip = new JSZip();
    const zipFile = await zip.loadAsync(file);
    const imageFiles = Object.values(zipFile.files)
      .filter((file) => !file.dir && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .sort((a, b) => a.name.localeCompare(b.name));

    const imageUrlsWithNames: { url: string; name: string }[] = await Promise.all(
      imageFiles.map(async (file) => {
        const blob = await file.async("blob");
        const url = URL.createObjectURL(blob);
        return { url, name: file.name };
      })
    );
    console.log("imageUrlsWithNames"+JSON.stringify(imageUrlsWithNames,null,2))
    setImages(imageUrlsWithNames);
  } catch (error) {
    console.error("Error unzipping file:", error);
  }
  setIsLoading(false);
};
const handleImageLoad = (url: string, name: string) => {
    setLoadedImages((prevLoadedImages) => [...prevLoadedImages, { url, name }]);
  };
const handleRefresh = () => {
  window.location.reload();
};
  return (
    <div style={{display:"grid", placeItems:"center"}}>
      <input type="file" onChange={handleFileChange} accept=".zip" className="file-upload"/>
      <div className="main-content">
{isLoading && <img src={loadingGif} alt="Loading..." />}
      {images
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ url, name }, index) => (
          <div key={index}>
            <img
              src={url}
              alt={name}
              onLoad={() => handleImageLoad(url, name)}
              style={{ display: "none" }}
            />
          </div>
        ))}
      {loadedImages
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ url, name }, index) => (
          <div key={index}>
            <img src={url} alt={name} />
          </div>
        ))}

        <button className="refresh-btn">
          <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.85 7.5c0-2.835 2.21-5.65 5.65-5.65 2.778 0 4.152 2.056 4.737 3.15H10.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-1 0v1.813C12.296 3.071 10.666.85 7.5.85 3.437.85.85 4.185.85 7.5s2.587 6.65 6.65 6.65c1.944 0 3.562-.77 4.714-1.942a6.8 6.8 0 0 0 1.428-2.167.5.5 0 1 0-.925-.38 5.8 5.8 0 0 1-1.216 1.846c-.971.99-2.336 1.643-4.001 1.643-3.44 0-5.65-2.815-5.65-5.65" fill="#000"/></svg>
        </button>
    </div>
    </div>
  );
};

export default Index;
