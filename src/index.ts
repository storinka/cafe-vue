import { App, reactive } from "vue";
import { CafeResultV3 } from "./types";

export * from "./types";

export interface StorinkaOptions {
    apiUrl?: string;
}

export class Storinka {
    options: StorinkaOptions;

    state: {
        isLoading: boolean;
        id?: string;
        cafe?: CafeResultV3;
    };

    constructor(options: StorinkaOptions) {
        this.options = options;

        this.state = reactive({
            isLoading: false,
        });
    }

    setCafe(id: string, language: string): Promise<CafeResultV3> {
        this.state.isLoading = true;
        this.state.id = id;

        return this.invoke("getCafe", {
            id,
            language,
        })
            .then((cafe) => {
                this.state.cafe = cafe;

                return cafe;
            })
            .finally(() => {
                this.state.isLoading = false;
            });
    }

    setLanguage(language: string): Promise<CafeResultV3> {
        return this.invoke("getCafe", {
            id: this.state.id,
            language,
        })
            .then((cafe) => {
                this.state.cafe = cafe;

                return cafe;
            })
            .finally(() => {
                this.state.isLoading = false;
            });
    }

    invoke(name: string, params: any = {}): Promise<any> {
        return fetch(
            `${this.options.apiUrl}/invoke/3/${name}`,
            {
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(params),
            },
        )
            .then((r) => r.json())
            .then((r) => r.result);
    }

    install(app: App): void {
        // @ts-ignore
        app.provide("storinka", this);

        // eslint-disable-next-line no-param-reassign
        app.config.globalProperties.$storinka = this;
    }
}

const defaultCreateStorinkaOptions: StorinkaOptions = {
    apiUrl: "https://api.storinka.menu",
};

export function createStorinka(options: StorinkaOptions = defaultCreateStorinkaOptions): Storinka {
    return new Storinka(options);
}

declare module '@vue/runtime-core' {
    export interface ComponentCustomProperties {
        $storinka: Storinka;
    }
}
