"use client";

import { Facebook, Link, Linkedin, LinkedinIcon, LucideTwitter } from "lucide-react";
import React, { useState } from "react";

const socials = [
  {
    name: "Facebook",
    icon: <Facebook />,
    buildHref: (url, title) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Twitter",
    icon: <LucideTwitter />,
    buildHref: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(title)}`,
  },
  {
    name: "LinkedIn",
    icon: <Linkedin />,
    buildHref: (url, title) =>
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(title)}`,
  },
  {
    name: "WhatsApp",
    icon: <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            fill="currentColor"
            className="w-6 h-6 text-green-500"
          >
            <path d="M19.11 17.49c-.3-.15-1.77-.87-2.04-.96-.27-.09-.47-.15-.66.15-.19.3-.75.96-.92 1.15-.17.19-.34.21-.63.06-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.19-.3.3-.49.09-.19.04-.36-.02-.51-.06-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.51h-.57c-.19 0-.49.07-.75.36-.26.3-.98.96-.98 2.34s1.01 2.71 1.15 2.89c.15.19 1.99 3.03 4.81 4.25 2.83 1.22 2.83.82 3.34.77.51-.04 1.66-.68 1.89-1.34.23-.66.23-1.23.17-1.34-.06-.11-.24-.19-.54-.34zM16 3C9.38 3 4 8.38 4 15c0 2.45.79 4.73 2.13 6.58L4 29l7.68-2.02C13 27.64 14.46 28 16 28c6.62 0 12-5.38 12-12S22.62 3 16 3z" />
          </svg>,
    buildHref: (url, title) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(
        title
      )}%20${encodeURIComponent(url)}`,
  },
];

const SocialShare = ({ url, title, className = "", itemClass = "" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div
      className={`nc-SocialShare flex items-center space-x-2 ${className}`}
      data-nc-id="SocialShare"
    >
      {/* {socials.map((item, index) => (
        <a
          key={index}
          href={item.buildHref(url, title)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Share on ${item.name}`}
          className={`rounded-full w-8 h-8 flex items-center justify-center bg-white text-neutral-600 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition ${itemClass}`}
        >
          {item.icon}
        </a>
      ))} */}

      {/* Copy Link button */}
      <button
        onClick={handleCopy}
        title="Copy link"
        className={`rounded-full w-8 h-8 flex items-center justify-center bg-white text-neutral-600 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition ${itemClass}`}
      >
        <Link />
      </button>

      {copied && (
        <span className="text-xs text-green-600 ml-2">Link copied!</span>
      )}
    </div>
  );
};

export default SocialShare;
