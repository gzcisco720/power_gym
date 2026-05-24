/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightbox } from '@/components/shared/image-lightbox';

const images = [
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
];

describe('ImageLightbox', () => {
  it('renders the current image when open', () => {
    render(
      <ImageLightbox
        images={images}
        initialIndex={0}
        open={true}
        onClose={() => {}}
      />,
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('sample.jpg');
  });

  it('advances to next image when Next button clicked', () => {
    render(
      <ImageLightbox
        images={images}
        initialIndex={0}
        open={true}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /next image/i }));
    expect(screen.getByRole('img').getAttribute('src')).toContain('sample2.jpg');
  });

  it('goes back to previous image when Prev button clicked', () => {
    render(
      <ImageLightbox
        images={images}
        initialIndex={1}
        open={true}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /previous image/i }));
    expect(screen.getByRole('img').getAttribute('src')).toContain('sample.jpg');
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = jest.fn();
    render(
      <ImageLightbox images={images} initialIndex={0} open={true} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    render(
      <ImageLightbox images={images} initialIndex={0} open={false} onClose={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when images array is empty', () => {
    render(
      <ImageLightbox images={[]} initialIndex={0} open={true} onClose={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides navigation buttons when only one image', () => {
    render(
      <ImageLightbox images={[images[0]]} initialIndex={0} open={true} onClose={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: /next image/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous image/i })).not.toBeInTheDocument();
  });
});
