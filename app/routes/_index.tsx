import React, { useEffect, useMemo, useState } from "react";
import { MetaFunction } from "@remix-run/node";
import JSZip from "jszip";
import type { LinksFunction } from "@remix-run/node";
import styles from "~/styles/styles.css?url";
import jsPDF from "jspdf";
import loadingGif from "~/loading-thinking.gif";
import logo1 from "~/logo.svg";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap",
  },
];

export const meta: MetaFunction = () => {
  return [
    { title: "View/Download zip of images as PDF" },
    { name: "description", content: "A web app that helps you view the image contents of your zip file completely on your phone" },
  ];
};

type ZipImage = { url: string; name: string };
type GalleryZip = { id: string; fileName: string; previewUrl: string; images: ZipImage[] };

const sortByName = (a: ZipImage, b: ZipImage) => {
  if (a.name.length !== b.name.length) return a.name.length - b.name.length;
  return a.name.localeCompare(b.name);
};

const Index = () => {
  const [images, setImages] = useState<ZipImage[]>([]);
  const [loadedImages, setLoadedImages] = useState<ZipImage[]>([]);
  const [selectedSource, setSelectedSource] = useState("NH");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "gallery">("single");
  const [galleryZips, setGalleryZips] = useState<GalleryZip[]>([]);
  const [activeZipId, setActiveZipId] = useState<string | null>(null);

  const sortedImages = useMemo(() => [...images].sort(sortByName), [images]);

  useEffect(() => {
    setLoadedImages([]);
  }, [images]);

  const handleSource = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedSource(event.target.value);
  };

  const parseZipFile = async (file: File): Promise<ZipImage[]> => {
    const zip = new JSZip();
    const zipFile = await zip.loadAsync(file);
    const imageFiles = Object.values(zipFile.files).filter(
      (zipEntry) =>
        !zipEntry.dir &&
        /\.(jpg|jpeg|png|gif|webp)$/i.test(zipEntry.name) &&
        (selectedSource !== "NH" || !zipEntry.name.match(/t\.(jpg|jpeg|png|gif|webp)$/i))
    );

    const imageUrlsWithNames = await Promise.all(
      imageFiles.map(async (zipEntry) => {
        const blob = await zipEntry.async("blob");
        return { url: URL.createObjectURL(blob), name: zipEntry.name };
      })
    );

    return imageUrlsWithNames.sort(sortByName);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    const file = event.target.files?.[0];
    if (!file) {
      setIsLoading(false);
      return;
    }

    try {
      const parsedImages = await parseZipFile(file);
      setImages(parsedImages);
      setViewMode("single");
      setActiveZipId(null);
      setGalleryZips([]);
    } catch (error) {
      console.error("Error unzipping file:", error);
    }

    setIsLoading(false);
  };

  const handleFolderChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    const files = Array.from(event.target.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".zip"));
    if (files.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const parsed = await Promise.all(
        files.map(async (file, idx) => {
          const zipImages = await parseZipFile(file);
          if (zipImages.length === 0) return null;
          return {
            id: `${file.name}-${idx}`,
            fileName: file.name,
            previewUrl: zipImages[0].url,
            images: zipImages,
          };
        })
      );

      const validZips = parsed.filter((item): item is GalleryZip => Boolean(item));
      setGalleryZips(validZips);
      setViewMode("gallery");
      setActiveZipId(null);
      setImages([]);
    } catch (error) {
      console.error("Error parsing folder zips:", error);
    }

    setIsLoading(false);
  };

  const activeZip = galleryZips.find((zipFile) => zipFile.id === activeZipId);
  const displayImages = activeZip ? activeZip.images : sortedImages;

  const handleImageLoad = (url: string, name: string) => {
    setLoadedImages((prevLoadedImages) => {
      const alreadyLoaded = prevLoadedImages.some((image) => image.url === url);
      if (alreadyLoaded) return prevLoadedImages;
      return [...prevLoadedImages, { url, name }].sort(sortByName);
    });
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    loadedImages.forEach(({ url }, index) => {
      const image = new Image();
      image.src = url;
      const width = 200;
      const height = (image.height * width) / image.width;
      if (index !== 0) doc.addPage();
      doc.addImage(url, "JPEG", 10, 10, width, height);
    });
    doc.save(generateFilename());
  };

  const generateFilename = () => {
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = String(currentDate.getFullYear()).slice(-2);
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");
    return `${day}${month}${year}${hours}${minutes}.pdf`;
  };

  const handleRefresh = () => window.location.reload();

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <div className="source-check-group">
        <label>
          <input type="radio" name="source" value="NH" className="source-check" checked={selectedSource === "NH"} onChange={handleSource} />
          <img src={logo1} alt="logo1" />
        </label>
        <label>
          <input type="radio" name="source" value="" checked={selectedSource === ""} onChange={handleSource} />
          Other
        </label>
      </div>

      <div className="upload-actions">
        <input type="file" onChange={handleFileChange} accept=".zip" className="file-upload" />
        <input type="file" multiple webkitdirectory="" onChange={handleFolderChange} accept=".zip" className="file-upload" />
      </div>

      <div className="main-content">
        {isLoading && <img src={loadingGif} alt="Loading..." />}

        {viewMode === "gallery" && !activeZip && (
          <div className="gallery-grid">
            {galleryZips.map((zipFile) => (
              <button key={zipFile.id} className="gallery-card" onClick={() => { setImages(zipFile.images); setActiveZipId(zipFile.id); }}>
                <img src={zipFile.previewUrl} alt={zipFile.fileName} />
                <span>{zipFile.fileName}</span>
              </button>
            ))}
          </div>
        )}

        {activeZip && (
          <button className="back-btn" onClick={() => { setActiveZipId(null); setLoadedImages([]); }}>
            Back to gallery
          </button>
        )}

        {displayImages.map(({ url, name }, index) => (
          <div key={`${name}-${index}`}>
            <img src={url} alt={name} onLoad={() => handleImageLoad(url, name)} style={{ display: "none" }} />
          </div>
        ))}

        {loadedImages.map(({ url, name }, index) => (
          <div key={`loaded-${index}`}>
            <img src={url} title={name} aria-label="loaded-image" />
          </div>
        ))}

        <button role="reload" title="Reload the page" className="refresh-btn" onClick={handleRefresh}>↻</button>
        <button role="download" title="download the pdf" className="download-btn" disabled={loadedImages.length === 0} style={{ display: loadedImages.length === 0 ? "none" : "block" }} onClick={downloadPDF}>↓</button>
      </div>
    </div>
  );
};

export default Index;
