import { cropImageToBlob } from '@/lib/image/crop-image';

const mockDrawImage = jest.fn();
const mockGetContext = jest.fn().mockReturnValue({ drawImage: mockDrawImage });

beforeAll(() => {
  // @ts-expect-error — jsdom canvas stub
  HTMLCanvasElement.prototype.getContext = mockGetContext;

  Object.defineProperty(global, 'Image', {
    value: class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_url: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    },
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  mockDrawImage.mockClear();
  mockGetContext.mockClear();
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['px'], { type: 'image/webp' }));
    });
});

describe('cropImageToBlob', () => {
  it('returns a Blob', async () => {
    const blob = await cropImageToBlob('data:image/png;base64,abc', {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('draws the image with negated crop origin', async () => {
    await cropImageToBlob('data:image/png;base64,abc', {
      x: 20,
      y: 30,
      width: 100,
      height: 100,
    });
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), -20, -30);
  });

  it('calls toBlob with webp format at 0.9 quality', async () => {
    const toBlobSpy = jest.spyOn(HTMLCanvasElement.prototype, 'toBlob');
    await cropImageToBlob('data:image/png;base64,abc', {
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    });
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);
  });

  it('rejects when toBlob returns null', async () => {
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementationOnce((callback: BlobCallback) => {
        callback(null);
      });
    await expect(
      cropImageToBlob('data:image/png;base64,abc', { x: 0, y: 0, width: 50, height: 50 }),
    ).rejects.toThrow('Canvas toBlob returned null');
  });
});
