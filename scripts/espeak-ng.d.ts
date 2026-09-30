declare module "espeak-ng" {
  interface ESpeakInstance {
    FS: { readFile(path: string): Uint8Array };
  }
  export default function ESpeakNg(opts: { arguments: string[]; print?: (text: string) => void }): Promise<ESpeakInstance>;
}
