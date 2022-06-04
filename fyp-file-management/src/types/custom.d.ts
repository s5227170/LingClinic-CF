import { ParsedFiles } from "./index";

declare global {
  namespace Express {
    interface Request {
      files: ParsedFiles[];
    }
  }
}

export default global;
