import React, { useState } from "react";
import { MetaFunction } from "@remix-run/node";
import JSZip from "jszip";
import type { LinksFunction } from "@remix-run/node";
import styles from '~/styles/styles.css?url'
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

  const handleFileChange = async (event:any) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const zipFile = await zip.loadAsync(file);
      const imageFiles = Object.values(zipFile.files).filter(
        (file) => !file.dir && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );

      const imageUrls = await Promise.all(
        imageFiles.map(async (file) => {
          const blob = await file.async("blob");
          return URL.createObjectURL(blob);
        })
      );

      setImages(imageUrls);
    } catch (error) {
      console.error("Error unzipping file:", error);
    }
  };

  return (
    <div style={{display:"grid", placeItems:"center"}}>
      <input type="file" onChange={handleFileChange} accept=".zip" className="file-upload"/>
      <div className="main-content">
        {images.map((imageUrl, index) => (
          <img key={index} src={imageUrl}/>
        ))}
      </div>
    </div>
  );
};

export default Index;
