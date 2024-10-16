import { system, world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import Translate from "./translate";
import { CommandPermissionLevel } from "./command";
import { ChestFormData } from "./utils/chestgui";
import PlayerRank from "./playerrank";
export class FormButton {
    constructor(text, imagePath = "") {
        this.imagePath = imagePath;
        if (typeof text === "string")
            text = Translate.translate(text);
        this.text = text;
    }
    destruct() {
        this.text = null;
        this.imagePath = null;
    }
}
class FormComponent {
    constructor(type, text) {
        this.type = type;
        this.text = text;
    }
    destruct() {
        this.text = null;
        this.type = null;
    }
}
/**
 * @deprecated
 */
export class FormLabel extends FormComponent {
    constructor(text) {
        if (typeof text === "string")
            text = Translate.translate(text);
        super("label", text);
        this.type = "label";
    }
    destruct() {
        this.text = null;
        this.type = null;
    }
}
export class FormToggle extends FormComponent {
    constructor(text, defaultValue) {
        if (typeof text === "string")
            text = Translate.translate(text);
        super("toggle", text);
        this.type = "toggle";
        if (defaultValue)
            this.default = defaultValue;
        else
            this.default = false;
    }
    destruct() {
        this.text = null;
        this.default = null;
        this.type = null;
    }
}
export class FormSlider extends FormComponent {
    constructor(text, min, max, step, defaultValue) {
        if (typeof text === "string")
            text = Translate.translate(text);
        super("slider", text);
        this.type = "slider";
        this.min = min;
        this.max = max;
        this.step = step;
        if (defaultValue)
            this.default = defaultValue;
        else
            this.default = min;
    }
    destruct() {
        this.text = null;
        this.min = null;
        this.max = null;
        this.default = null;
        this.type = null;
    }
}
/**
 * @deprecated
 */
export class FormStepSlider extends FormComponent {
    constructor(text, steps, defaultIndex) {
        if (typeof text === "string")
            text = Translate.translate(text);
        if (steps.find((v) => typeof v === "string"))
            steps = steps.map((v) => {
                if (typeof v === "string")
                    return Translate.translate(v);
                return v;
            });
        super("step_slider", text);
        this.type = "step_slider";
        this.steps = steps;
        if (defaultIndex)
            this.default = defaultIndex;
        else
            this.default = 0;
    }
    destruct() {
        this.text = null;
        this.steps = null;
        this.default = null;
        this.type = null;
    }
}
export class FormDropdown extends FormComponent {
    constructor(text, options, defaultIndex) {
        if (typeof text === "string")
            text = Translate.translate(text);
        if (options.find((v) => typeof v === "string"))
            options = options.map((v) => {
                if (typeof v === "string")
                    return Translate.translate(v);
                return v;
            });
        super("dropdown", text);
        this.type = "dropdown";
        this.options = options;
        if (defaultIndex)
            this.default = defaultIndex;
        else
            this.default = 0;
    }
    destruct() {
        this.text = null;
        this.options = null;
        this.default = null;
        this.type = null;
    }
}
export class FormInput extends FormComponent {
    constructor(text, placeholder, defaultValue) {
        if (typeof text === "string")
            text = Translate.translate(text);
        if (typeof placeholder === "string")
            placeholder = Translate.translate(placeholder);
        if (typeof defaultValue === "string")
            defaultValue = Translate.translate(defaultValue);
        super("input", text);
        this.type = "input";
        this.placeholder = placeholder;
        this.default = defaultValue;
    }
    destruct() {
        this.text = null;
        this.placeholder = null;
        this.default = null;
        this.type = null;
    }
}
const PlayerBusyList = new Map();
const TextureItems = new Map();
export class ChestForm {
    static setItemTexture(itemId, texture, enchanted = false) {
        TextureItems.set(itemId, [texture, enchanted]);
    }
    constructor(title = "", size = "single") {
        const form = new ChestFormData(size);
        form.title(title);
        this.form = form;
    }
    setTitle(title) {
        this.form.title(title);
    }
    setButton(slot, itemName, itemDesc, texture, stackAmount, enchanted) {
        if (texture) {
            const _texture = TextureItems.get(texture);
            if (_texture) {
                texture = _texture[0];
                if (!enchanted && _texture[1])
                    enchanted = true;
            }
        }
        this.form.button(slot, itemName, itemDesc, texture, stackAmount, enchanted);
    }
    setPattern(pattern, key) {
        this.form.pattern(pattern, key);
    }
    sendTo(player, permission, busy = true) {
        const form = this.form;
        return new Promise((resolve, reject) => {
            system.run(async () => {
                try {
                    if (permission === CommandPermissionLevel.ADMIN)
                        permission = "admin";
                    if (permission === CommandPermissionLevel.NORMAL)
                        permission = undefined;
                    if (permission && !PlayerRank.hasPermission(player.id, permission)) {
                        resolve({
                            canceled: true,
                            cancelationReason: FormCancelationReason.UserClosed,
                        });
                        return;
                    }
                    const res = await form.show(player);
                    if (res.cancelationReason === FormCancelationReason.UserBusy && busy) {
                        let setted = false;
                        let timeout = 0;
                        player.sendMessage(Translate.translate("form-ui.message.busy"));
                        const interval = system.runInterval(() => {
                            if (setted === false) {
                                PlayerBusyList.set(player.id, interval);
                                setted = true;
                            }
                            if (timeout >= 600 || PlayerBusyList.get(player.id) !== interval) {
                                system.clearRun(interval);
                                resolve(res);
                            }
                            if (player.isJumping) {
                                system.clearRun(interval);
                                resolve(this.sendTo(player, permission, busy));
                            }
                            timeout++;
                        }, 2);
                        world.beforeEvents.playerLeave.subscribe((ev) => {
                            if (ev.player.id === player.id) {
                                system.clearRun(interval);
                                reject(`FormUI: ${player.name} left`);
                            }
                        });
                        return;
                    }
                    resolve(res);
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
export class SimpleForm {
    constructor(title = "", content = "", buttons = []) {
        this.labels = new Map();
        this.data = {
            title,
            content,
            buttons,
        };
    }
    getTitle() {
        return this.data.title;
    }
    setTitle(title) {
        this.data.title = title;
    }
    getContent() {
        return this.data.content;
    }
    setContent(content) {
        this.data.content = content;
    }
    addButton(button, label) {
        this.data.buttons.push(button);
        if (label)
            this.labels.set(this.data.buttons.length - 1, label);
    }
    getButton(indexOrLabel) {
        if (typeof indexOrLabel === "string") {
            for (const [index, label] of this.labels) {
                if (label === indexOrLabel)
                    return this.data.buttons[index];
            }
        }
        else {
            return this.data.buttons[indexOrLabel];
        }
        return null;
    }
    sendTo(player, permission, force = true) {
        const form = new ActionFormData();
        if (typeof this.data.title === "string")
            this.data.title = Translate.translate(this.data.title);
        if (typeof this.data.content === "string")
            this.data.content = Translate.translate(this.data.content);
        form.title(this.data.title);
        form.body(this.data.content);
        this.data.buttons.forEach((button) => form.button(button.text, button.imagePath));
        return new Promise((resolve, reject) => {
            system.run(async () => {
                try {
                    if (permission === CommandPermissionLevel.ADMIN)
                        permission = "admin";
                    if (permission === CommandPermissionLevel.NORMAL)
                        permission = undefined;
                    if (permission && !PlayerRank.hasPermission(player.id, permission)) {
                        resolve({
                            canceled: true,
                            cancelationReason: FormCancelationReason.UserClosed,
                        });
                        return;
                    }
                    const res = await form.show(player);
                    if (res.cancelationReason === FormCancelationReason.UserBusy && force) {
                        let setted = false;
                        let timeout = 0;
                        player.sendMessage(Translate.translate("form-ui.message.busy"));
                        const interval = system.runInterval(() => {
                            if (setted === false) {
                                PlayerBusyList.set(player.id, interval);
                                setted = true;
                            }
                            if (timeout >= 600 || PlayerBusyList.get(player.id) !== interval) {
                                system.clearRun(interval);
                                resolve(res);
                            }
                            if (player.isJumping) {
                                system.clearRun(interval);
                                resolve(this.sendTo(player, permission, force));
                            }
                            timeout++;
                        }, 2);
                        world.beforeEvents.playerLeave.subscribe((ev) => {
                            if (ev.player.id === player.id) {
                                system.clearRun(interval);
                                reject(`FormUI: ${player.name} left`);
                            }
                        });
                        return;
                    }
                    resolve(res);
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
export class ModalForm {
    constructor(title = "", content = "") {
        this.data = {
            title,
            content,
            button1: "",
            button2: "",
        };
    }
    getTitle() {
        return this.data.title;
    }
    setTitle(title) {
        this.data.title = title;
    }
    getContent() {
        return this.data.content;
    }
    setContent(content) {
        this.data.content = content;
    }
    getButtonConfirm() {
        return this.data.button1;
    }
    setButtonConfirm(text) {
        if (typeof text === "string")
            text = Translate.translate(text);
        this.data.button1 = text;
    }
    getButtonCancel() {
        return this.data.button2;
    }
    setButtonCancel(text) {
        if (typeof text === "string")
            text = Translate.translate(text);
        this.data.button2 = text;
    }
    sendTo(player, permission, busy = true) {
        const form = new MessageFormData();
        if (typeof this.data.title === "string")
            this.data.title = Translate.translate(this.data.title);
        if (typeof this.data.content === "string")
            this.data.content = Translate.translate(this.data.content);
        form.title(this.data.title);
        form.body(this.data.content);
        form.button2(this.data.button1);
        form.button1(this.data.button2);
        return new Promise((resolve, reject) => {
            system.run(async () => {
                try {
                    if (permission === CommandPermissionLevel.ADMIN)
                        permission = "admin";
                    if (permission === CommandPermissionLevel.NORMAL)
                        permission = undefined;
                    if (permission && !PlayerRank.hasPermission(player.id, permission)) {
                        resolve({
                            canceled: true,
                            cancelationReason: FormCancelationReason.UserClosed,
                        });
                        return;
                    }
                    const res = await form.show(player);
                    if (res.cancelationReason === FormCancelationReason.UserBusy && busy) {
                        let setted = false;
                        let timeout = 0;
                        player.sendMessage(Translate.translate("form-ui.message.busy"));
                        const interval = system.runInterval(() => {
                            if (setted === false) {
                                PlayerBusyList.set(player.id, interval);
                                setted = true;
                            }
                            if (timeout >= 600 || PlayerBusyList.get(player.id) !== interval) {
                                system.clearRun(interval);
                                resolve(res);
                            }
                            if (player.isJumping) {
                                system.clearRun(interval);
                                resolve(this.sendTo(player, permission, busy));
                            }
                            timeout++;
                        }, 2);
                        world.beforeEvents.playerLeave.subscribe((ev) => {
                            if (ev.player.id === player.id) {
                                system.clearRun(interval);
                                reject(`FormUI: ${player.name} left`);
                            }
                        });
                        return;
                    }
                    resolve(res);
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
export class CustomForm {
    constructor(title = "", content = []) {
        this.labels = new Map();
        this.data = {
            title,
            content: content,
        };
    }
    getTitle() {
        return this.data.title;
    }
    setTitle(title) {
        this.data.title = title;
    }
    addComponent(component, label) {
        this.data.content.push(component);
        if (label)
            this.labels.set(this.data.content.length - 1, label);
    }
    getComponent(indexOrLabel) {
        if (typeof indexOrLabel === "string") {
            for (const [index, label] of this.labels) {
                if (label === indexOrLabel)
                    return this.data.content[index];
            }
        }
        else {
            return this.data.content[indexOrLabel];
        }
        return null;
    }
    sendTo(player, permission, busy = true) {
        const form = new ModalFormData();
        if (typeof this.data.title === "string")
            this.data.title = Translate.translate(this.data.title);
        form.title(this.data.title);
        this.data.content.forEach((item) => {
            if (item.type === "input")
                form.textField(item.text, item.placeholder, item.default);
            if (item.type === "toggle")
                form.toggle(item.text, item.default);
            if (item.type === "slider")
                form.slider(item.text, item.min, item.max, item.step, item.default);
            if (item.type === "step_slider")
                form.dropdown(item.text, item.steps, item.default);
            if (item.type === "dropdown")
                form.dropdown(item.text, item.options, item.default);
        });
        return new Promise((resolve, reject) => {
            system.run(async () => {
                try {
                    if (permission === CommandPermissionLevel.ADMIN)
                        permission = "admin";
                    if (permission === CommandPermissionLevel.NORMAL)
                        permission = undefined;
                    if (permission && !PlayerRank.hasPermission(player.id, permission)) {
                        resolve({
                            canceled: true,
                            cancelationReason: FormCancelationReason.UserClosed,
                        });
                        return;
                    }
                    const res = await form.show(player);
                    if (res.cancelationReason === FormCancelationReason.UserBusy && busy) {
                        let setted = false;
                        let timeout = 0;
                        player.sendMessage(Translate.translate("form-ui.message.busy"));
                        const interval = system.runInterval(() => {
                            if (setted === false) {
                                PlayerBusyList.set(player.id, interval);
                                setted = true;
                            }
                            if (timeout >= 600 || PlayerBusyList.get(player.id) !== interval) {
                                system.clearRun(interval);
                                resolve(res);
                            }
                            if (player.isJumping) {
                                system.clearRun(interval);
                                resolve(this.sendTo(player, permission, busy));
                            }
                            timeout++;
                        }, 2);
                        world.beforeEvents.playerLeave.subscribe((ev) => {
                            if (ev.player.id === player.id) {
                                system.clearRun(interval);
                                reject(`FormUI: ${player.name} left`);
                            }
                        });
                        return;
                    }
                    resolve(res);
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
