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
    <div className="container">
      <header>
        <h1>Zip-to-PDF Converter 📦</h1>
        <p>Seamlessly transform your zipped images into a clean PDF document.</p>
      </header>

      <div className="source-check-group">
        <label>
          <input type="radio" name="source" value="NH" className="source-check" checked={selectedSource === "NH"} onChange={handleSource} />
          <img src={logo1} alt="logo1" />
          <span>Source NH</span>
        </label>
        <label>
          <input type="radio" name="source" value="" checked={selectedSource === ""} onChange={handleSource} />
          <span>Default</span>
        </label>
      </div>

      <div className="upload-section">
        <div className="upload-card">
          <h3>Single Zip File</h3>
          <p>Click or drag a single .zip file here</p>
          <input type="file" onChange={handleFileChange} accept=".zip" className="file-input-hidden" />
        </div>
        <div className="upload-card">
          <h3>Batch Folders</h3>
          <p>Select a folder containing multiple zips</p>
          <input type="file" multiple webkitdirectory="" onChange={handleFolderChange} accept=".zip" className="file-input-hidden" />
        </div>
      </div>

      <div className="main-content">
        {isLoading && (
          <div className="loading-container">
            <img src={loadingGif} alt="Loading..." />
            <p>Processing your files...</p>
          </div>
        )}

        {viewMode === "gallery" && !activeZip && (
          <div className="gallery-grid">
            {galleryZips.map((zipFile) => (
              <button key={zipFile.id} className="gallery-card" onClick={() => { setImages(zipFile.images); setActiveZipId(zipFile.id); }}>
                <img src={zipFile.previewUrl} alt={zipFile.fileName} className="preview-img" />
                <span>{zipFile.fileName}</span>
              </button>
            ))}
          </div>
        )}

        {activeZip && (
          <button className="back-btn" onClick={() => { setActiveZipId(null); setLoadedImages([]); }}>
            ← Back to Gallery
          </button>
        )}

        {displayImages.map(({ url, name }, index) => (
          <div key={`${name}-${index}`}>
            <img src={url} alt={name} onLoad={() => handleImageLoad(url, name)} style={{ display: "none" }} />
          </div>
        ))}

        <div className="viewer-grid">
          {loadedImages.map(({ url, name }, index) => (
            <div key={`loaded-${index}`}>
              <img src={url} title={name} aria-label="loaded-image" />
            </div>
          ))}
        </div>

        <div className="controls-overlay">
          <button role="download" title="Download PDF" className="floating-btn" disabled={loadedImages.length === 0} style={{ display: loadedImages.length === 0 ? "none" : "flex" }} onClick={downloadPDF}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button role="reload" title="Reset" className="floating-btn" onClick={handleRefresh}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
