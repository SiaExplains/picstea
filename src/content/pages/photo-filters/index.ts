import type { PageCopy, Translated } from "../types";
import de from "./de";
import en from "./en";
import es from "./es";
import ptBr from "./pt-br";

export const copy: Translated<PageCopy> = { en, es, "pt-br": ptBr, de };
