import {
    AdvertisementResultV3,
    CafeResultV3,
    CategoryResultV3,
    DishResultV3,
    MenuResultV3,
    PopupButtonResultV3,
    PopupResultV3
} from "../types";
import { Storinka } from "../index";

function isNoAnal() {
    // @ts-ignore
    const noAnal = /[?&]no_anal/.test(window.location.search) || process?.env?.DISABLE_ANAL || localStorage.getItem("__no_anal") === "on";

    if (noAnal) {
        localStorage.setItem("__no_anal", "on");
    }

    return noAnal;
}

function getRandomGUID() {
    const u = Date.now().toString(16) + Math.random().toString(16) + "0".repeat(16);
    return [u.substr(0, 8), u.substr(8, 4), "4000-8" + u.substr(13, 3), u.substr(16, 12)].join("-");
}

function bloau(str: string) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode(Number(`0x${p1}`));
        }));
}

function atobu(str: string) {
    return decodeURIComponent(atob(str).split("").map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
}

export function getStorinkaTID() {
    let tid = localStorage.getItem("__anal_tid");

    const recreate = () => {
        tid = getRandomGUID();
        localStorage.setItem("__anal_tid", bloau(tid));
    };

    if (!tid) {
        recreate();
    } else {
        try {
            tid = atobu(tid);
        } catch (e) {
            recreate();
        }

        if (!tid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
            recreate();
        }
    }

    return tid;
}

export enum StorinkaAnalyticsItemType {
    OPEN_CAFE = 100,
    OPEN_MENU = 200,
    OPEN_CATEGORY = 300,
    OPEN_DISH = 400,
    OPEN_ADVERTISEMENT = 500,
    OPEN_POPUP = 600,
    CLICK_POPUP_BUTTON = 601,
}

export enum GtagEventAction {
    OPEN = "open",
    CLICK = "click",
    SWITCH = "switch",
}

export interface StorinkaAnalyticsOptions {
    enable?: boolean;

    apiUrl?: string;
    apiVersion?: string;
}

function seePopup(popup: PopupResultV3, storinka: Storinka) {
    let seenPopups = storinka.storage.getItem("seen_popups");

    if (!Array.isArray(seenPopups)) {
        seenPopups = [];
    }

    if (seenPopups.includes(popup.id)) {
        return;
    }

    seenPopups = [...seenPopups, popup.id];

    storinka.storage.setItem("seen_popups", seenPopups);
}


export class StorinkaAnalytics {
    options: StorinkaAnalyticsOptions;
    reported: { [key: number]: number[] };
    storinka: Storinka;

    constructor(options: StorinkaAnalyticsOptions = {}, storinka: Storinka) {
        this.options = options;
        this.storinka = storinka;

        if (this.options.enable === undefined) {
            this.options.enable = false;
        }
        if (!this.options.apiUrl) {
            this.options.apiUrl = "https://analytics.storinka.menu";
        }
        if (!this.options.apiVersion) {
            this.options.apiVersion = "1";
        }

        this.reported = {};
    }

    isReported(type: StorinkaAnalyticsItemType, id: number) {
        const reported: number[] | undefined = this.reported[type];

        if (!reported) {
            return false;
        }

        return reported.includes(id);
    }

    pushReported(type: StorinkaAnalyticsItemType, id: number): void {
        const reported: number[] | undefined = this.reported[type];

        if (reported) {
            reported.push(id);
        } else {
            this.reported[type] = [id];
        }
    }

    invoke(name: string, params?: any): Promise<any> {
        return fetch(`${this.options.apiUrl}/${this.options.apiVersion}/${name}`, {
            method: "PATCH",
            body: JSON.stringify({
                tid: getStorinkaTID(),
                ...params,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    send(type: StorinkaAnalyticsItemType, id: number): Promise<unknown> {
        if (!this.options.enable) {
            return Promise.resolve();
        }

        if (isNoAnal()) {
            return Promise.resolve();
        }

        if (this.isReported(type, id)) {
            return Promise.resolve();
        }

        this.pushReported(type, id);

        return this.invoke("push", {
            ity: type,
            iid2: id,
        });
    }

    sendAlive(type: StorinkaAnalyticsItemType, id: number): Promise<unknown> {
        if (!this.options.enable) {
            return Promise.resolve();
        }

        if (isNoAnal()) {
            return Promise.resolve();
        }

        return this.invoke("pushAlive", {
            ity: type,
            iid2: id,
        });
    }

    sendGtag(action: GtagEventAction, category: string, label: string): void {
        if (isNoAnal()) {
            return;
        }

        const gtag = (window as any).gtag;

        if (gtag) {
            gtag("event", action, {
                event_category: category,
                event_label: label
            });
        }
    }

    reportCafeWasOpen(cafe: CafeResultV3): Promise<unknown> {
        return this.send(StorinkaAnalyticsItemType.OPEN_CAFE, cafe.id);
    }

    reportMenuWasOpen(menu: MenuResultV3): Promise<unknown> {
        this.sendGtag(GtagEventAction.OPEN, "menu", menu.name);

        return this.send(StorinkaAnalyticsItemType.OPEN_MENU, menu.id);
    }

    reportCategoryWasOpen(category: CategoryResultV3): Promise<unknown> {
        this.sendGtag(GtagEventAction.OPEN, "menu", category.name);

        return this.send(StorinkaAnalyticsItemType.OPEN_CATEGORY, category.id);
    }

    reportDishWasOpen(dish: DishResultV3): Promise<unknown> {
        this.sendGtag(GtagEventAction.OPEN, "product", dish.name);

        return this.send(StorinkaAnalyticsItemType.OPEN_DISH, dish.id);
    }

    reportAdvertisementWasOpen(advertisement: AdvertisementResultV3): Promise<unknown> {
        this.sendGtag(GtagEventAction.OPEN, "advertisement", advertisement.title);

        return Promise.resolve();
    }

    reportPopupWasOpen(popup: PopupResultV3): Promise<unknown> {
        this.sendGtag(GtagEventAction.OPEN, "popup", popup.title || String(popup.id));

        seePopup(popup, this.storinka);

        if (!isNoAnal()) {
            this.storinka.invoke("reportPopupWasOpen", {
                popup_id: popup.id,
                tid: getStorinkaTID(),
            });
        }

        return this.send(StorinkaAnalyticsItemType.OPEN_POPUP, popup.id);
    }

    reportPopupButtonWasClicked(button: PopupButtonResultV3): Promise<unknown> {
        this.sendGtag(GtagEventAction.CLICK, "popup-button", button.text || String(button.id));

        if (!isNoAnal()) {
            this.storinka.invoke("reportPopupButtonWasClicked", {
                popup_button_id: button.id,
                tid: getStorinkaTID(),
            });
        }

        return this.send(StorinkaAnalyticsItemType.CLICK_POPUP_BUTTON, button.id);
    }

    reportLanguageWasSwitched(code: string): Promise<unknown> {
        this.sendGtag(GtagEventAction.SWITCH, "language", code);

        return Promise.resolve();
    }
}

