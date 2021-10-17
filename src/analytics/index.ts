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

export enum ItemType {
    OPEN_CAFE = 100,
    OPEN_INFO = 102,

    OPEN_MENU = 200,

    OPEN_CATEGORY = 300,
    OPEN_CATEGORY_SWIPE = 301,

    OPEN_DISH = 400,
    OPEN_DISH_FROM_SEARCH = 401,
}

export interface StorinkaAnalyticsOptions {
    enable?: boolean;

    apiUrl?: string;
    apiVersion?: string;
}

export class StorinkaAnalytics {
    options: StorinkaAnalyticsOptions;

    constructor(options: StorinkaAnalyticsOptions = {}) {
        this.options = options;

        if (this.options.enable === undefined) {
            this.options.enable = false;
        }
        if (!this.options.apiUrl) {
            this.options.apiUrl = "https://analytics.storinka.menu";
        }
        if (!this.options.apiVersion) {
            this.options.apiVersion = "1";
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

    push(type: ItemType, id: number): Promise<unknown> {
        if (!this.options.enable) {
            return Promise.resolve();
        }

        return this.invoke("push", {
            ity: type,
            iid: id,
        });
    }

    pushAlive(type: ItemType, id: number): Promise<unknown> {
        if (!this.options.enable) {
            return Promise.resolve();
        }

        return this.invoke("pushAlive", {
            ity: type,
            iid: id,
        });
    }
}
