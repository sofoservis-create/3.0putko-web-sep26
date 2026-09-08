"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import uploadImageToCloudinary from "../../utlis/uploadCloudinary.js";

// ✅ Prevent SSR issue with ReactQuill
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ["small", false, "large", "huge"] }],
    [{ align: [] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    ["link", "image"],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    ["code-block"],
    ["clean"],
    [{ color: [] }, { background: [] }],
  ],
};

const authors = [
  {
    value: "Jan",
    authorName: "Jan",
    authorImg:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1768074023/Jan_ovwloi.jpg",
  },
  {
    value: "Martin",
    authorName: "Martin",
    authorImg:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1768074071/Martin_ghyjj4.jpg",
  },
];

const BlogForm = ({ id, onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState(authors[0].value);
  const [authorImg, setAuthorImg] = useState(authors[0].authorImg);
  const [authorName, setAuthorName] = useState(authors[0].authorName);
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [tagList, setTagList] = useState([]);
  const [image, setImage] = useState("");
  const [previewURL, setPreviewURL] = useState("");
  const [summary, setSummary] = useState("");
  const [blogType, setBlogType] = useState("customer");
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch data if editing
  useEffect(() => {
    const fetchBlogData = async () => {
      if (id) {
        setIsEdit(true);
        setLoading(true);
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/blog/${id}`
          );
          const result = await res.json();

          if (res.ok) {
            setTitle(result.title || "");
            setContent(result.content || "");
            setSelectedAuthor(result.author || authors[0].value);
            const authorObj = authors.find((a) => a.value === result.author) || authors[0];
            setAuthorImg(authorObj.authorImg);
            setAuthorName(authorObj.authorName);

            setCategories(result.categories || "");
            setTagList(result.tags || []);
            setImage(result.image || "");
            setPreviewURL(result.image || "");
            setSummary(result.summary || "");
            setBlogType(result.blogType || "customer");
          } else {
            toast.error(result.message || "Error fetching blog");
          }
        } catch (err) {
          toast.error("Error fetching blog");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBlogData();
  }, [id]);

  // ✅ Tag input
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tags.trim() !== "") {
      e.preventDefault();
      if (!tagList.includes(tags.trim())) {
        setTagList((prev) => [...prev, tags.trim()]);
      }
      setTags("");
    }
  };

  // ✅ Image Upload
  const handleFileInputChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const data = await uploadImageToCloudinary(file);
        setPreviewURL(data.url);
        setImage(data.url);
      } catch (error) {
        toast.error("Image upload failed");
      }
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImage("");
    setPreviewURL("");
  };

  // ✅ Author change
  const handleAuthorChange = (e) => {
    const author = authors.find((a) => a.value === e.target.value);
    if (author) {
      setSelectedAuthor(author.value);
      setAuthorImg(author.authorImg);
      setAuthorName(author.authorName);
    }
  };

  // ✅ Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    // Find author object directly from selectedAuthor
    const authorObj = authors.find((a) => a.value === selectedAuthor);

    const blogData = {
      title,
      content,
      author: selectedAuthor,
      authorImg: authorObj?.authorImg || "",
      authorName: authorObj?.authorName || "",
      categories,
      tags: tagList,
      image,
      summary,
      blogType,
    };

    try {
      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/blog/${id}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/blog`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blogData),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(
          isEdit ? "Blog updated successfully!" : "Blog created successfully!"
        );

        if (onSuccess) onSuccess(result, isEdit);
        if (onClose) onClose();
      } else {
        toast.error(result.message || "Error saving blog");
      }
    } catch (err) {
      toast.error("Error saving blog");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading blog data...</p>;

  return (
    <form onSubmit={handleSubmit} className="w-[1200px] mx-auto">
      {/* Upload Image */}
      {!previewURL && (
        <label className="block mb-4 cursor-pointer">
          <input
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept=".jpg, .png"
          />
          <span className="bg-blue-500 text-white px-4 py-2 rounded">
            Upload Featured Image
          </span>
        </label>
      )}
      {previewURL && (
        <div className="mb-4 relative inline-block">
          <img
            src={previewURL}
            alt="Preview"
            className="h-40 object-cover rounded"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Title"
        className="w-full p-3 mb-4 border rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <ReactQuill
        value={content}
        onChange={setContent}
        modules={modules}
        className="mb-10"
        style={{ minHeight: "100px" }}
      />

      <textarea
        placeholder="Summary"
        className="w-full p-3 mb-4 border rounded"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />

      <select
        className="w-full p-3 mb-4 border rounded"
        value={blogType}
        onChange={(e) => setBlogType(e.target.value)}
      >
        <option value="customer">Customer Blog</option>
        <option value="provider">Provider Blog</option>
      </select>

      {/* ✅ Author Dropdown */}
      <select
        className="w-full p-3 mb-4 border rounded"
        value={selectedAuthor}
        onChange={handleAuthorChange}
      >
        {authors.map((author) => (
          <option key={author.value} value={author.value}>
            {author.value}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Categories"
        className="w-full p-3 mb-4 border rounded"
        value={categories}
        onChange={(e) => setCategories(e.target.value)}
      />

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tagList.map((tag, idx) => (
          <span
            key={idx}
            className="bg-blue-200 px-2 py-1 rounded text-sm text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            {tag}
            <button
              type="button"
              onClick={() => setTagList(tagList.filter((t) => t !== tag))}
              className="text-red-600 font-bold ml-1"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Add tags and press Enter"
        className="w-full p-3 mb-4 border rounded"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        onKeyDown={handleTagKeyDown}
      />

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {isEdit ? "Update Blog" : "Create Blog"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BlogForm;
