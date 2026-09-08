import React from 'react';

export default function NextImage(props) {
  const { src, alt, fill, layout, objectFit, objectPosition, priority, placeholder, blurDataURL, unoptimized, ...rest } = props;
  
  let imgStyle = { ...props.style };
  
  if (fill || layout === 'fill') {
    imgStyle = {
      ...imgStyle,
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: objectFit || 'cover',
      objectPosition: objectPosition || 'center'
    };
  }
  
  return <img src={src} alt={alt || ""} style={imgStyle} {...rest} loading={priority ? 'eager' : 'lazy'} />;
}
