import React from 'react';

const Avatar = ({ src, alt = '', size = 10 }) => (
  <img
    src={src}
    alt={alt}
    className={`rounded-full object-cover w-${size} h-${size}`}
  />
);

export default Avatar;
