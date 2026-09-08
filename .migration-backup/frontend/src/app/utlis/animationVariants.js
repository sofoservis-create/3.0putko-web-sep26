export const variants = (x = 1000, opacity = 0) => ({
  enter: function (direction) {
    return {
      x: direction > 0 ? x : -x,
      opacity: opacity,
    };
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: function (direction) {
    return {
      x: direction < 0 ? x : -x,
      opacity: opacity,
    };
  },
});
