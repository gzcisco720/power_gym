import { render, screen } from '@testing-library/react';
import { CheckInPhotosSection } from '@/app/(dashboard)/member/check-in/_components/check-in-photos-section';

describe('CheckInPhotosSection', () => {
  it('shows count badge', () => {
    render(
      <CheckInPhotosSection photos={['url1', 'url2']} uploading={false} onFileChange={jest.fn()} />,
    );
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('renders an img for each uploaded photo', () => {
    render(
      <CheckInPhotosSection
        photos={['url1', 'url2', 'url3']}
        uploading={false}
        onFileChange={jest.fn()}
      />,
    );
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('shows the dashed add slot when fewer than 5 photos', () => {
    render(
      <CheckInPhotosSection photos={['url1']} uploading={false} onFileChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Add photo')).toBeInTheDocument();
  });

  it('hides the dashed add slot when 5 photos are uploaded', () => {
    render(
      <CheckInPhotosSection
        photos={['u1', 'u2', 'u3', 'u4', 'u5']}
        uploading={false}
        onFileChange={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Add photo')).not.toBeInTheDocument();
  });

  it('shows a spinner instead of + when uploading', () => {
    render(
      <CheckInPhotosSection photos={[]} uploading={true} onFileChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Uploading...')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add photo')).not.toBeInTheDocument();
  });
});
