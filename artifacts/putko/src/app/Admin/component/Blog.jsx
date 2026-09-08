"use client";
import React, { useState, useEffect } from "react";
import useFetchData from "../../hooks/useFetchData";
import { toast } from "react-toastify";
import Loading from "../../components/Loader/Loading";
import Error from "../../components/Error/Error";
import BlogForm from "./BlogForm";

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, loading, error } = useFetchData(
    `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/blog`
  );

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setBlogs(data);
    }
  }, [data]);

  // ✅ Delete Blog
  const handleDelete = async (id) => {
    const confirmDelete = confirm("Are you sure you want to delete this blog?");
    if (!confirmDelete) return;

    // Optimistic UI update
    const updatedBlogs = blogs.filter((blog) => blog._id !== id);
    setBlogs(updatedBlogs);

    try {
      const response = await fetch(
        `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/blog/${id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Blog deleted successfully");
      } else {
        const result = await response.json();
        toast.error(result.message || "Failed to delete blog");
        // rollback if failed
        setBlogs(blogs);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setBlogs(blogs); // rollback
    }
  };

  // ✅ Truncate content without breaking HTML
  const truncateContent = (content, maxLength) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content || "";
    const text = tempDiv.innerText;
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // ✅ Edit
  const handleEdit = (id) => {
    setSelectedBlogId(id);
    setIsFormOpen(true);
  };

  // ✅ Create
  const handleAddBlog = () => {
    setSelectedBlogId(null);
    setIsFormOpen(true);
  };

  // ✅ Close Form
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedBlogId(null);
  };

  return (
    <div className="p-4">
      {isFormOpen ? (
        <BlogForm
          id={selectedBlogId}
          onClose={handleFormClose}
          onSuccess={(newBlog, isEdit) => {
            if (isEdit) {
              setBlogs((prev) =>
                prev.map((blog) => (blog._id === newBlog._id ? newBlog : blog))
              );
            } else {
              setBlogs((prev) => [newBlog, ...prev]);
            }
            handleFormClose();
          }}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Blog List</h2>
            <button
              onClick={handleAddBlog}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              + Add Blog
            </button>
          </div>

          {/* Loading / Error / Empty */}
          {loading && <Loading />}
          {error && <Error message={error} />}
          {!loading && !error && blogs.length === 0 && (
            <p className="text-gray-500">No blogs found</p>
          )}

          {/* Blog Table */}
          {!loading && !error && blogs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead>
                  <tr>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">
                      Title
                    </th>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">
                      Author
                    </th>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">
                      Published Date
                    </th>
                    <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">
                      Content
                    </th>
                    <th className="py-2 px-4 bg-gray-200 text-center text-sm font-medium text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map((blog) => {
                    const truncated = truncateContent(blog.content, 30);
                    return (
                      <tr key={blog._id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{blog.title}</td>
                        <td className="py-2 px-4">{blog.author}</td>
                        <td className="py-2 px-4">
                          {new Date(blog.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 px-4">{truncated}</td>
                        <td className="py-2 px-4 flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(blog._id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(blog._id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Blog;
