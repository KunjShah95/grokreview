export type PrFile = {
  filePath: string;
  patch: string;
};

export type CodeChunk = {
  /** Unique id used as the Pinecone record id, e.g. `pr-42--src/foo.ts--part-0` */
  id: string;
  /** Source file path this chunk came from */
  filePath: string;
  /** Raw text stored in Pinecone and searched at review time */
  text: string;
};
