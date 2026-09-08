const checkInViewIntersectionObserver = ({
    target,
    options = { root: null, rootMargin: `0%`, threshold: 0 },
    callback,
    freezeOnceVisible = false,
  }) => {
    const _funCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          // If freezeOnceVisible is true, unobserve the target
          if (freezeOnceVisible) {
            observer.unobserve(entry.target);
          }
        }
      });
    };
  
    // Check if IntersectionObserver is supported
    if (typeof window.IntersectionObserver === "undefined") {
      console.error(
        "window.IntersectionObserver === undefined! => Your Browser is Not supported"
      );
      return;
    }
  
    const observer = new IntersectionObserver(_funCallback, options);
    if (target) {
      observer.observe(target);
    }
  };
  
  export default checkInViewIntersectionObserver;
  