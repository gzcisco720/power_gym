import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/lib/image/crop-image', () => ({
  cropImageToBlob: jest.fn().mockResolvedValue(new Blob(['crop'], { type: 'image/webp' })),
}));

jest.mock('react-easy-crop', () => ({
  __esModule: true,
  default: ({
    onCropComplete,
  }: {
    onCropComplete: (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) => void;
  }) => (
    <button
      data-testid="mock-cropper"
      onClick={() =>
        onCropComplete(
          { x: 0, y: 0, width: 100, height: 100 },
          { x: 10, y: 10, width: 200, height: 200 },
        )
      }
    />
  ),
}));

import { LogoCropDialog } from '@/components/settings/logo-crop-dialog';

describe('LogoCropDialog', () => {
  it('renders the dialog title', () => {
    render(
      <LogoCropDialog
        open
        imageSrc="data:image/png;base64,abc"
        onApply={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('Crop Logo')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <LogoCropDialog
        open
        imageSrc="data:image/png;base64,abc"
        onApply={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onApply with a Blob when Apply is clicked after crop', async () => {
    const onApply = jest.fn();
    render(
      <LogoCropDialog
        open
        imageSrc="data:image/png;base64,abc"
        onApply={onApply}
        onCancel={jest.fn()}
      />,
    );
    // Trigger onCropComplete via mock cropper
    fireEvent.click(screen.getByTestId('mock-cropper'));
    // Click Apply
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    // Wait for async cropImageToBlob
    await screen.findByRole('button', { name: /apply/i });
    expect(onApply).toHaveBeenCalledWith(expect.any(Blob));
  });
});
