import type { Translated } from "../types";
import de from "./de";
import en from "./en";
import es from "./es";
import ptBr from "./pt-br";
import type { HomeCopy } from "./types";

export const home: Translated<HomeCopy> = { en, es, "pt-br": ptBr, de };
