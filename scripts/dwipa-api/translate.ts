import { Player } from "@minecraft/server";
import { CustomForm, FormDropdown, FormToggle } from "./form-ui";
import NusaConfiguration from "./configuration";
 
const langs = new Map<string, Record<string, string>>();

namespace Translate {

    export async function setLanguage(language: string, dev_mode?: boolean, author?: Player): Promise<void> {
        if (!langs.has(language)) {
            author?.sendMessage(Translate.translate("translate.error.notfound"));
            return;
        }

        if (dev_mode !== undefined) await NusaConfiguration.setConfig("language.dev_mode", dev_mode);
        await NusaConfiguration.setConfig("language.lang", language);
        author?.sendMessage(Translate.translate("translate.success.set"));
    }

    export function setLanguageUI(player: Player) {
        let languagesArr = getLanguages();
        const form = new CustomForm("translate.form-ui.setlanguage.title", [
            new FormDropdown("translate.form-ui.setlanguage.contents.languages", languagesArr, languagesArr.findIndex((v) => v === getLanguage())),
            new FormToggle("translate.form-ui.setlanguage.contents.devmode", NusaConfiguration.getConfig("language.dev_mode") ?? false),
        ]);

        form.sendTo(player, "translate").then((res) => {
            if (res.formValues === undefined) return;
            setLanguage(languagesArr[+res.formValues[0]], Boolean(res.formValues[1]), player);
        });
    }

    export function getLanguage(): string {
        if (langs.has(NusaConfiguration.getConfig("language.lang") ?? "en-US")) return NusaConfiguration.getConfig("language.lang");
        else return [...langs.keys()][0];
    }

    export function getLanguages(): string[] {
        return [ ...langs.keys() ];
    }

    export function createLanguage(language: string, translates: Record<string, string>, author?: string): void {
        let data = langs.get(language) ?? {};
        langs.set(language, {...translates, ...data});
    }

    export function translate(text: string, replace: [string, string]|[string, string][] = []): string {
        const translate = langs.get(getLanguage());
        const devMode: boolean = NusaConfiguration.getConfig("language.dev_mode");

        if (translate && translate.hasOwnProperty(text)) return textReplace(translate[text], replace);
        if (translate && !translate.hasOwnProperty(text) && devMode) return textReplace(translate[text], replace);
        if (((translate && !translate.hasOwnProperty(text)) ? true : translate === undefined) && !devMode) {
            const findtranslate = [...langs.entries()].find(([key, value]) => value.hasOwnProperty(text));
            if (findtranslate) return textReplace(findtranslate[1][text], replace);
            else return textReplace(text, replace);
        }
        return textReplace(text, replace);
    }

    // export async function convert(fixReplace: boolean = false): Promise<Map<string, string>> {
    //     let lang = langs.get(getLanguage()) ?? langs.get([...langs.keys()][0]) ?? {};
    //     const langObject: Map<string, string> = new Map<string, string>();

    //     if (fixReplace) await new Promise((resolve, reject) => {
    //         system.run(() => {
    //             langs.forEach((value, key) => {
    //                 if (langs.get(getLanguage()) ? getLanguage() !== key : [...langs.keys()][0] !== key) {
    //                     for (const [langKey, langValue] of Object.entries(value)) {
    //                         if (!lang.hasOwnProperty(langKey)) lang[langKey]=langValue;
    //                     }
    //                 }
    //             });

    //             resolve(true);
    //         });
    //     });

    //     await new Promise((resolve, reject) => {
    //         system.run(() => {
    //             for (const [key, value] of Object.entries(lang)) langObject.set(key, value);
    //             resolve(true);
    //         });
    //     });

    //     return langObject;
    // }

    export function textReplace(text: string, replace: [string, string]|[string, string][]): string {
        if (replace.length === 0) return text;
        if (isArrayOfTuples(replace)) {
            replace.forEach(([v, w]) => {
                const reg = new RegExp(v, "g");
                text=text.replace(reg, w);
            });
        }
        else {
            const reg = new RegExp(replace[0], "g");
            text=text.replace(reg, replace[1]);
        }
    
        return text;
    }
}

export default Translate;

function isArrayOfTuples(obj: any): obj is [string, string][] {
    return Array.isArray(obj) && obj.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && typeof item[1] === 'string');
}