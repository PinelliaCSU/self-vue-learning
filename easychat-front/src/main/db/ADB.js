const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const NODE_ENV = process.env.NODE_ENV;


import { add_tables, add_index, alter_tables } from './Tables.js';

const userDir = os.homedir();
console.log(userDir);
const dbFolder = userDir + (NODE_ENV === 'development' ? '/.easychattest' : '/.easychat');
console.log(dbFolder);
if(!fs.existsSync(dbFolder)){
    fs.mkdirSync(dbFolder);
}

const db = new sqlite3.Database(dbFolder + '/local.db');
const globalColumnsMap = {};

//以下的方法就是拼接sql语句，然后执行
const createTable = ()=>{
    return new Promise(async(resolve, reject)=>{
        for(const item of add_tables){
            await db.run(item);
        }

        for(const item of add_index){
            await db.run(item);
        }

        for(const item of alter_tables){
            const fieldList = await queryAll(`PRAGMA table_info(${item.tableName})`,[]);
            const field = fieldList.some(row => row.name === item.fieldName);
            if(!field){
                await db.run(item.sql);
            }
        }

        resolve();
    })
}

const queryAll = (sql, params)=>{
    return new Promise((resolve, reject)=>{
        const stmt = db.prepare(sql);
        stmt.all(params, function(err, row){
            if(err){
                resolve([]);
            }
            row.forEach((item,index)=>{
               row[index] = convertDbObjectToBizObject(item);
            })
            resolve(row);
        });
        stmt.finalize();
    })
}

const initTableColumnsMap = async()=>{
    let sql = 'select name from sqlite_master where type="table" AND name!="sqlite_sequence"';
    const tables = await queryAll(sql, []);
    for(let i = 0;i < tables.length;i++){
        sql = `PRAGMA table_info(${tables[i].name})`;
        let columns = await queryAll(sql, []);
        const columnsMapItem = {};
        for(let j = 0;j < columns.length;j++){
            columnsMapItem[toCamelCase(columns[j].name)] = columns[j].name;
        }
        globalColumnsMap[tables[i].name] = columnsMapItem;
    }
    console.log(globalColumnsMap);
}


const convertDbObjectToBizObject = (data)=>{
    if(!data){
        return null;
    }

    const bizData = {};
    for(let item in data){
        bizData[toCamelCase(item)] = data[item];
    }
    return bizData;
}

//把数据库中的下划线转成驼峰
const toCamelCase = (str)=>{
    return str.replace(/_([a-z])/g, function(match,p1){
        return String.fromCharCode(p1.charCodeAt(0) - 32);
    });
}



const queryCount = (sql, params)=>{
    return new Promise((resolve, reject)=>{
        const stmt = db.prepare(sql);
        stmt.get(params, function(err, row){
            if(err){
                resolve(0);//无记录
            }
            resolve(Array.from(Object.values(row))[0]);
        });
        stmt.finalize();
    })
}


const queryOne = (sql, params)=>{
    return new Promise((resolve, reject)=>{
        const stmt = db.prepare(sql);
        stmt.get(params, function(err, row){
            if(err){
                resolve(null);
            }
            resolve(convertDbObjectToBizObject(row));
            console.log(`执行的sql:${sql},params:${params},row:${JSON.stringify(row)}`)
        });
        stmt.finalize();
    })

}

const run = (sql, params)=>{
    return new Promise((resolve, reject)=>{
        const stmt = db.prepare(sql);
        stmt.run(params, function(err,row){
            if(err){
                console.log(`执行的sql:${sql},params:${params},执行失败:${err}`)
                resolve("操作数据库失败");
            }
            console.log(`执行的sql:${sql},params:${params},执行记录数:${this.changes}`)
            resolve(this.changes);
        });
        stmt.finalize();
    })
}

const insert = (sqlPrefix,tableName, data)=>{
    const columnsMap = globalColumnsMap[tableName];
    const dbColumns = [];
    const params = [];
    for(let item in data){
        if(data != undefined && columnsMap[item] != undefined){
            dbColumns.push(columnsMap[item]);
            params.push(data[item]);
        }
    }
    const prepare = "?".repeat(dbColumns.length).split("").join(",");
    const sql = `${sqlPrefix} ${tableName}(${dbColumns.join(",")})values(${prepare})`;
    return run(sql, params);
}

const insertOrReplace = (tableName, data)=>{
    return insert("insert or replace into", tableName, data);
}

const insertOrIgnore = (tableName, data)=>{
    return insert("insert or ignore into", tableName, data);
}


const Update = (tableName, data, paramData)=>{
    const columnsMap = globalColumnsMap[tableName];
    const dbColumns = [];
    const params = [];
    const whereColumns = [];
    for(let item in data){
        if(item!= undefined && columnsMap[item]!= undefined){
            dbColumns.push(`${columnsMap[item]} = ?`);
            params.push(data[item]);
        }
    }

    for(let item in paramData){
        if(paramData[item]){
            params.push(paramData[item]);
            whereColumns.push(`${columnsMap[item]} =?`);
        }
    }

    const sql = `update ${tableName} set ${dbColumns.join(",")} ${whereColumns.length >0 ? 'where ' : ' '}${whereColumns.join(" and ")}`;
    return run(sql, params);
}

const init = ()=>{
    db.serialize(async()=>{
       await createTable();
       await initTableColumnsMap();
    })
}

init();

export{
    run,
    queryAll,
    queryCount,
    queryOne,
    insertOrReplace,
    insertOrIgnore,
    Update,
    insert
}