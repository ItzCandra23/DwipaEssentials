import { CustomForm, FormItems, SimpleForm } from "./form-ui";
import Database from "./database";
import Translate from "./translate";
var ChatFilter;
(function (ChatFilter) {
    function getRawFilters() {
        const data = Database.get("candra:chatfilter");
        if (typeof data !== "object")
            return [];
        else
            return data;
    }
    ChatFilter.getRawFilters = getRawFilters;
    function getFilters() {
        return getRawFilters().map((v) => {
            let txts = v.split("=");
            if (txts.length === 1 && txts[0].length > 0)
                return txts[0];
            if (txts.length > 1 && txts[0].length === 0)
                return v;
            if (txts.length > 1 && txts[0].length > 0) {
                const txt0 = txts[0];
                txts.shift();
                const txt1 = txts.join("=");
                if (txt1 === "")
                    return txt0;
                if (txt1 === "*")
                    return [txt0, "*".repeat(txt0.length)];
                return [txt0, txt1];
            }
            ;
        });
    }
    ChatFilter.getFilters = getFilters;
    function filterChat(chat) {
        getFilters().forEach((txt) => {
            if (typeof txt === "string") {
                const key = new RegExp(txt, "gi");
                chat = chat.replace(key, "");
            }
            else {
                const key = new RegExp(txt[0], "gi");
                chat = chat.replace(key, txt[1]);
            }
        });
        return chat;
    }
    ChatFilter.filterChat = filterChat;
    function addFilter(txt, author) {
        let data = getRawFilters();
        if (txt === "") {
            author === null || author === void 0 ? void 0 : author.sendMessage(Translate.translate("chatfilter.error.invalid"));
            return false;
        }
        if (data.includes(txt)) {
            author === null || author === void 0 ? void 0 : author.sendMessage(Translate.translate("chatfilter.error.already"));
            return false;
        }
        data.push(txt);
        Database.set("candra:chatfilter", data);
        author === null || author === void 0 ? void 0 : author.sendMessage(Translate.translate("chatfilter.success.add"));
        return true;
    }
    ChatFilter.addFilter = addFilter;
    function removeFilter(txt, author) {
        let data = getRawFilters();
        if (!data.includes(txt)) {
            author === null || author === void 0 ? void 0 : author.sendMessage(Translate.translate("chatfilter.error.notfound"));
            return false;
        }
        data = data.filter((v) => v !== txt);
        Database.set("candra:chatfilter", data);
        author === null || author === void 0 ? void 0 : author.sendMessage(Translate.translate("chatfilter.success.remove"));
        return true;
    }
    ChatFilter.removeFilter = removeFilter;
    function adminUI(player) {
        const filters = ChatFilter.getRawFilters();
        const form = new SimpleForm("chatfilter.form-ui.admin.title", "chatfilter.form-ui.admin.description", [
            ...filters.map((v) => FormItems.FormButton(Translate.translate("chatfilter.form-ui.admin.buttons.filter", ["{filter}", v]))),
            FormItems.FormButton("chatfilter.form-ui.admin.buttons.addfilter"),
        ]);
        form.sendTo(player, "chatfilter").then((res) => {
            if (res.selection === undefined)
                return;
            if (res.selection === filters.length) {
                const form2 = new CustomForm();
                form2.setTitle("chatfilter.form-ui.addfilter.title");
                form2.addComponent(FormItems.FormInput("chatfilter.form-ui.addfilter.contents.filter", "chatfilter.form-ui.addfilter.contents.filter.placeholder"));
                form2.sendTo(player, "chatfilter").then((res2) => {
                    if (res2.formValues === undefined)
                        return;
                    ChatFilter.addFilter(`${res2.formValues[0]}`, player);
                });
                return;
            }
            ChatFilter.removeFilter(filters[res.selection], player);
        });
    }
    ChatFilter.adminUI = adminUI;
})(ChatFilter || (ChatFilter = {}));
export default ChatFilter;
