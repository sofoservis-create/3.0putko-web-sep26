"use client";
//Static import
import React, { useState, useEffect, useContext } from "react";
import Link from "@/app/components/NextLink";
import { useParams } from "@/app/components/NextNavigation";
import { StarIcon } from "@heroicons/react/24/solid";
import Badge from "../../Shared/Badge";
import NcImage from "../../Shared/NcImage/NcImage";
import Header from "../../components/Header";
import Avatar from "../../Blog/component/Avatar";
import FooterNav from "../../Shared/FooterNav";
import HeroSearchForm2Mobile from "../../components/HeroSearchForm2Mobile";
import MenuBar from "../../Shared/MenuBar";
import Head from "@/app/components/NextHead";
//dynamic import
import dynamic from "@/app/components/NextDynamic";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { FormContext } from "../../FormContext";
const CommentForm = dynamic(() => import("../../Shared/CommentForm"), { ssr: false });
const Comment = dynamic(() => import("../../Shared/Comment"), { ssr: false });
const Footer = dynamic(() => import("../../components/Footer/Footer"), { ssr: false });
const SocialShare = dynamic(() => import("../../Shared/SocialShare"), { ssr: false });
const ButtonPrimary = dynamic(() => import("../../Shared/Button"), { ssr: false });

export default function ClientPage() {
  const params = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentStats, setCommentStats] = useState({ totalComments: 0, averageRating: 0 });
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [relatedBlogsLoading, setRelatedBlogsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerSlide] = useState(4); // Number of items to show per slide
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const fetchComments = async (blogId) => {
    try {
      setCommentsLoading(true);
      const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/blog-comments/blog/${blogId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments || []);
      setCommentStats({
        totalComments: data.pagination?.totalComments || 0,
        averageRating: data.ratingStats?.averageRating || 0
      });
    } catch (err) {
      setCommentsError(err.message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchRelatedBlogs = async () => {
    try {
      setRelatedBlogsLoading(true);
      const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/blog`);
      if (!response.ok) {
        throw new Error('Failed to fetch related blogs');
      }
      const data = await response.json();
      // Filter out current blog and get all related blogs

      setRelatedBlogs(data);
    } catch (err) {
      console.error('Error fetching related blogs:', err);
    } finally {
      setRelatedBlogsLoading(false);
    }
  };

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/blog/slug/${params.slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch blog');
        }
        const blogData = await response.json();
        setBlog(blogData);

        // Fetch comments and related blogs after blog is loaded
        fetchComments(blogData._id);
        fetchRelatedBlogs();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchBlog();
    }
  }, [params.slug]);

  // Increment view when page loads
  useEffect(() => {
    const incrementView = async () => {
      if (blog?._id) {
        await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/blog/${blog._id}/view`, {
          method: "POST",
        });
      }
    };
    incrementView();
  }, [blog?._id]);

  // Slider navigation functions
  const nextSlide = () => {
    const maxSlides = Math.ceil(relatedBlogs.length / itemsPerSlide);
    setCurrentSlide((prev) => (prev + 1) % maxSlides);
  };

  const prevSlide = () => {
    const maxSlides = Math.ceil(relatedBlogs.length / itemsPerSlide);
    setCurrentSlide((prev) => (prev - 1 + maxSlides) % maxSlides);
  };

  const goToSlide = (slideIndex) => {
    setCurrentSlide(slideIndex);
  };

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying && relatedBlogs.length > itemsPerSlide && !isHovered) {
      const interval = setInterval(() => {
        nextSlide();
      }, 5000); // Change slide every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, relatedBlogs.length, itemsPerSlide, isHovered]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (relatedBlogs.length <= itemsPerSlide) return;

      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [relatedBlogs.length, itemsPerSlide]);

  if (loading) {
    return (
      <div className="nc-PageSingle pt-8 lg:pt-16">
        <div className="container">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-6000 mx-auto mb-4"></div>
              <p className="text-neutral-600 dark:text-neutral-400">{t.Loadingblogpost}...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nc-PageSingle pt-8 lg:pt-16">
        <div className="container">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
              <ButtonPrimary onClick={() => window.location.reload()}>
                Try Again
              </ButtonPrimary>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="nc-PageSingle pt-8 lg:pt-16">
        <div className="container">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <p className="text-neutral-600 dark:text-neutral-400">Blog post not found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const renderHeader = () => (
    <header className="container rounded-xl pt-8 lg:pt-16">
      <div className="max-w-screen-md mx-auto space-y-5">
        <Badge href="##" color="purple" name={blog.categories || "Traveler"} />
        <h1
          className="text-neutral-900 font-semibold text-3xl md:text-4xl md:!leading-[120%] lg:text-4xl dark:text-neutral-100 max-w-4xl"
          title={blog.title}
        >
          {blog.title}
        </h1>
        <span className="block text-base text-neutral-500 md:text-lg dark:text-neutral-400 pb-1 text-justify">
          {blog.summary}
        </span>

        <div className="w-full border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex flex-col items-baseline sm:flex-row sm:justify-between">
          <div className="nc-PostMeta2 flex items-center flex-wrap text-neutral-700 text-left dark:text-neutral-200 text-sm leading-none flex-shrink-0">
            <Avatar
              containerClassName="flex-shrink-0"
              sizeClass="w-8 h-8 sm:h-11 sm:w-11"
              imgUrl={blog.authorImg || "/Image-16.avif"}
              userName={blog.author}
            />
            <div className="ml-3">
              <div className="flex items-center">
                <Link className="block font-semibold" href="#">
                  {blog.author}
                </Link>
              </div>
              <div className="text-xs mt-[6px]">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {new Date(blog.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="mx-2 font-semibold">·</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {Math.ceil(blog.content.split(' ').length / 200)} {t.minread}
                </span>
                <span className="mx-2 font-semibold">·</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  👁 {blog.views || 0} {t.views}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-3">
            <SocialShare
              url={`https://putko.sk/blog/${blog.slug}`}
              title={blog.title}
              className="mt-6"
            />
          </div>
        </div>
      </div>
    </header>
  );

  const renderContent = () => (
    <div
      id="single-entry-content"
      className="prose dark:prose-invert prose-sm !max-w-screen-md sm:prose lg:prose-lg mx-auto dark:prose-dark text-justify"
      dangerouslySetInnerHTML={{ __html: blog.content }}
    />
  );

  const renderTags = () => (
    <div className="max-w-screen-md mx-auto flex flex-wrap">
      {blog.tags && blog.tags.length > 0 ? blog.tags.map((tag) => (
        <Link
          key={tag}
          href="#"
          className="nc-Tag inline-block bg-white text-sm text-neutral-600 dark:text-neutral-300 py-2 rounded-lg border border-neutral-100 md:px-4 dark:bg-neutral-700 dark:border-neutral-700 hover:border-neutral-200 mr-2 mb-2"
        >
          {tag}
        </Link>
      )) : (
        <span className="text-neutral-500 dark:text-neutral-400 text-sm">{t.Notagsavailable}</span>
      )}
    </div>
  );

  const renderAuthor = () => (
    <div className="max-w-screen-md mx-auto">
      <div className="nc-SingleAuthor flex">
        <Avatar
          sizeClass="w-11 h-11 md:w-24 md:h-24"
          imgUrl={blog.authorImg || "/Image-16.avif"}
          userName={blog.author}
        />
        <div className="flex flex-col ml-3 max-w-lg sm:ml-5 space-y-1">
          <span className="text-xs text-neutral-400 uppercase tracking-wider">
            {t.WRITTENBY}
          </span>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-200">
            <Link href="#">{blog.author}</Link>
          </h2>
          <span className="text-sm text-neutral-500 sm:text-base dark:text-neutral-300">
            {blog.blogType === 'customer' ? t.CustomerExperience : t.ProviderInsights}
            <Link className="text-primary-6000 font-medium ml-1" href="#">
              {t.Readmore}
            </Link>
          </span>
        </div>
      </div>
    </div>
  );

  const handleCommentAdded = (newComment) => {
    // Refresh comments to get the updated structure
    if (blog && blog._id) {
      fetchComments(blog._id);
    }
  };

  const renderCommentForm = () => (
    <div className="max-w-screen-md mx-auto pt-5">
      <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
        {t.LeaveaComment}
      </h3>
      <div className="mt-5">
        <CommentForm
          blogId={blog._id}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </div>
  );

  const renderCommentLists = () => {
    if (commentsLoading) {
      return (
        <div className="max-w-screen-md mx-auto">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-6000"></div>
            <span className="ml-3 text-neutral-600 dark:text-neutral-400">{t.Loadingcomments}...</span>
          </div>
        </div>
      );
    }

    if (commentsError) {
      return (
        <div className="max-w-screen-md mx-auto">
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{t.Errorloadingcomments}: {commentsError}</p>
            <ButtonPrimary onClick={() => fetchComments(blog._id)}>
              Try Again
            </ButtonPrimary>
          </div>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div className="max-w-screen-md mx-auto">
          <div className="text-center py-8">
            <p className="text-neutral-600 dark:text-neutral-400">{t.NocommentsyetBethefirsttocomment}!</p>
          </div>
        </div>
      );
    }

    // Group comments by parent (main comments and their replies)
    const mainComments = comments.filter(comment => !comment.parentCommentId);
    const replies = comments.filter(comment => comment.parentCommentId);

    return (
      <div className="max-w-screen-md mx-auto">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            {t.Comments} ({commentStats.totalComments})
          </h3>
          {commentStats.averageRating > 0 && (
            <div className="flex items-center mt-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400 mr-2">
                {t.AverageRating}:
              </span>
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(commentStats.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
                ({commentStats.averageRating.toFixed(1)})
              </span>
            </div>
          )}
        </div>

        <ul className="nc-SingleCommentLists space-y-5">
          {mainComments.map((comment) => {
            const commentReplies = replies.filter(reply => {
              // Handle both string ID and populated object cases
              const parentId = reply.parentCommentId;
              const isMatch = parentId === comment._id ||
                (parentId && parentId._id === comment._id) ||
                (parentId && parentId.toString() === comment._id.toString());
              return isMatch;
            });

            return (
              <li key={comment._id}>
                <Comment
                  comment={comment}
                  blogId={blog._id}
                  onReplyAdded={handleCommentAdded}
                />
                {commentReplies.length > 0 && (
                  <ul className="pl-4 mt-5 space-y-5 md:pl-11">
                    {commentReplies.map((reply) => (
                      <li key={reply._id}>
                        <Comment
                          isSmall
                          comment={reply}
                          blogId={blog._id}
                          onReplyAdded={handleCommentAdded}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderPostRelated = (blogItem) => (
    <div
      key={blogItem.slug}
      className="relative aspect-w-3 aspect-h-4 rounded-3xl overflow-hidden group w-full"
    >
      <Link href={`/Blog-Detail/${blogItem.slug}`} />
      <NcImage
        className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
        src={blogItem.image || "https://images.unsplash.com/photo-1501493870936-9c2e41625521"}
      />
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black"></div>
      <div className="flex flex-col justify-end items-start text-xs text-neutral-300 space-y-2.5 p-4">
        <Badge name={blogItem.categories || "Blog"} />
        <h2 className="block text-lg font-semibold text-white ">
          <span className="line-clamp-2">{blogItem.title}</span>
        </h2>
        <div className="flex">
          <span className="block text-neutral-200 font-medium truncate">
            {blogItem.author}
          </span>
          <span className="mx-1.5 font-medium">·</span>
          <span className="font-normal truncate">
            {new Date(blogItem.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
      <Link href={`/Blog-Detail/${blogItem.slug}`} />
    </div>
  );

  return (
    <>
      <Head>
        <title>{blog?.title ? `${blog.title} – Putko` : "Článok – Putko"}</title>
        <meta
          name="description"
          content={(blog?.summary || "Cestovateľské tipy a inšpirácie od Putka.").slice(0, 160)}
        />
        <link rel="canonical" href={`https://putko.sk/Blog-Detail/${params.slug}`} />
        <meta property="og:title" content={blog?.title ? `${blog.title} – Putko` : "Článok – Putko"} />
        <meta property="og:description" content={(blog?.summary || "Cestovateľské tipy a inšpirácie od Putka.").slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://putko.sk/Blog-Detail/${params.slug}`} />
        {blog?.image && <meta property="og:image" content={blog.image} />}
      </Head>
      <div className="nc-PageSingle lg:pt-24">
        <div
          className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
          style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
        >
          <div className="flex-1">
            <HeroSearchForm2Mobile />
          </div>
          <div>
            <MenuBar />
          </div>
        </div>
        <div className="hidden lg:block">
          <Header />
        </div>

        {renderHeader()}
        {blog.image && (
          <NcImage
            className="w-full rounded-xl"
            containerClassName="container my-10 sm:my-12"
            src={blog.image}
          />
        )}
        <div className="nc-SingleContent container space-y-10">
          {renderContent()}
          {renderTags()}
          <div className="max-w-screen-md mx-auto border-b border-t border-neutral-100 dark:border-neutral-700"></div>
          {renderAuthor()}
          {renderCommentForm()}
          {renderCommentLists()}
        </div>
        <div className="relative bg-neutral-100 dark:bg-neutral-800 py-16 lg:py-28 mt-16 lg:mt-24 pb-24">
          <div className="container">
            {/* ==== HEADER ==== */}
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-semibold">{t.Relatedposts}</h2>
              {relatedBlogs.length > 0 && (
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {relatedBlogs.length}{" "}
                  {relatedBlogs.length === 1 ? t.post : t.posts} {t.available}
                </span>
              )}
            </div>

            {/* ==== LOADING STATE ==== */}
            {relatedBlogsLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-6000"></div>
                <span className="ml-3 text-neutral-600 dark:text-neutral-400">
                  {t.Loadingrelatedposts}...
                </span>
              </div>
            ) : relatedBlogs.length > 0 ? (
              <>
                {/* ==== POSTS GRID ==== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 px-2">
                  {relatedBlogs
                    .slice(
                      currentSlide * itemsPerSlide,
                      (currentSlide + 1) * itemsPerSlide
                    )
                    .map(renderPostRelated)}
                </div>

                {/* ==== CONTROLS & DOTS ==== */}
                {relatedBlogs.length > itemsPerSlide && (
                  <div className="flex flex-col items-center mt-8">
                    <div className="flex justify-center items-center space-x-4">
                      {/* Prev Button */}
                      <button
                        onClick={prevSlide}
                        className="p-3 rounded-full bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-primary-6000 hover:text-gray-500 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentSlide === 0}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>

                      {/* Pagination Dots (5 max visible) */}
                      <div className="flex space-x-2">
                        {(() => {
                          const totalSlides = Math.ceil(
                            relatedBlogs.length / itemsPerSlide
                          );
                          const maxVisibleDots = 5;

                          const startIndex =
                            Math.floor(currentSlide / maxVisibleDots) * maxVisibleDots;
                          const endIndex = Math.min(
                            startIndex + maxVisibleDots,
                            totalSlides
                          );

                          return Array.from({
                            length: endIndex - startIndex,
                          }).map((_, index) => {
                            const dotIndex = startIndex + index;
                            return (
                              <button
                                key={dotIndex}
                                onClick={() => goToSlide(dotIndex)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === dotIndex
                                  ? "bg-primary-6000 scale-125"
                                  : "bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400"
                                  }`}
                              />
                            );
                          });
                        })()}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={nextSlide}
                        className="p-3 rounded-full bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-primary-6000 hover:text-gray-500 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          currentSlide ===
                          Math.ceil(relatedBlogs.length / itemsPerSlide) - 1
                        }
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Slide Counter */}
                    <div className="text-center mt-4">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {currentSlide + 1} of{" "}
                        {Math.ceil(relatedBlogs.length / itemsPerSlide)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-600 dark:text-neutral-400">
                  {t.Norelatedpostsavailable}
                </p>
              </div>
            )}
          </div>
        </div>
        <Footer />
        <div className="lg:hidden">
          <FooterNav />
        </div>
      </div>
    </>
  );
}