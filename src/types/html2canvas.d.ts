declare module 'html2canvas' {
  interface Options {
    scale?: number;
    width?: number;
    height?: number;
    backgroundColor?: string;
    // 필요한 다른 옵션들...
  }

  interface Html2CanvasResult {
    toBlob(): Promise<Blob>;
    toDataURL(): string;
  }

  function html2canvas(element: HTMLElement, options?: Options): Promise<Html2CanvasResult>;
  export default html2canvas;
} 