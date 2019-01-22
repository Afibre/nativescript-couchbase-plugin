import { Observable } from 'tns-core-modules/data/observable';
import { Couchbase, Replicator } from 'nativescript-couchbase-plugin';
import { ObservableArray } from 'tns-core-modules/data/observable-array/observable-array';
import * as http from 'tns-core-modules/http';

export class HelloWorldModel extends Observable {
    public message: string;
    private db: Couchbase;
    items: ObservableArray<any> = new ObservableArray([]);
    input: string = '';
    replicator: Replicator;

    constructor() {
        super();
        this.db = new Couchbase('tns-couchbase');
        this.replicator = this.db.createReplication('ws://192.168.0.10:4984/tns-couchbase', 'both');
        this.replicator.setContinuous(true);
        this.db.addDatabaseChangeListener(changes => {
            for (let change of changes) {
                const doc = this.db.getDocument(change);
                if (doc) {
                    const length = this.items.length;
                    if (length === 0) {
                        this.items.push(doc);
                    } else {
                        for (let i = 0; i < length; i++) {
                            const item = this.items.getItem(i);
                            if (item.id === change) {
                                this.items.setItem(i, doc);
                                break;
                            } else if (i === length - 1) {
                                this.items.push(doc);
                            }
                        }
                    }
                } else {
                    this.items.forEach((item, index) => {
                        if (item.id === change) {
                            this.items.splice(index, 1);
                        }
                    });
                }
            }
        });
        this.replicator.start();
        const query = this.db.query();
        this.items.push(...query);
    }

    addItem() {
        const id = this.db.createDocument({
            title: this.input,
            created_at: new Date().toJSON()
        });
        http.getJSON('https://randomuser.me/api/').then((json: any) => {
            const result = json.results;
            return result[0].picture.large;
        }).then(url => {
            return http.getFile(url).then(file => {
                this.db.setBlob(id, 'image', file.path, 'image/png');
            });
        }).catch(e => {
            console.log('error getting ' + e);
        });
    }

    generateId(): string {
        return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0,
                v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
