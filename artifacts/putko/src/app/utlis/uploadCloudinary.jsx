const upload_preset = "Putkoproject";
const cloud_name = "dekgv22nb";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const uploadImageToCloudinary = async (file, t) => {
  if (!file) {
    throw new Error(t.errors?.noFile || "No file selected. Please choose a file to upload.");
  }

  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      t.errors?.fileTooLarge?.replace("{size}", fileSizeMB) ||
        `File size too large (${fileSizeMB} MB). Maximum allowed is 10 MB.`
    );
  }

  const uploadData = new FormData();
  uploadData.append("file", file);
  uploadData.append("upload_preset", upload_preset);
  uploadData.append("cloud_name", cloud_name);

  try {
    if (!navigator.onLine) {
      throw new Error(
        t.errors?.noInternet || "No internet connection. Please check your network and try again."
      );
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`, {
      method: "POST",
      body: uploadData,
    });

    const data = await res.json();

    if (!res.ok) {
      const message = data?.error?.message || t.errors?.uploadFail || "Failed to upload file.";
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error.message === "Failed to fetch") {
      throw new Error(
        t.errors?.networkError ||
          "Network error. Please check your internet connection and try again."
      );
    }

    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export default uploadImageToCloudinary;
