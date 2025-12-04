const fs = require('fs');
const fse = require('fs-extra');
const NODE_ENV = process.env.NODE_ENV;
const path = require('path');
const {app,ipcMain,shell, dialog} = require('electron');
const {exec} = require('child_process');
const FormData = require('form-data');
const axios = require('axios');
import store from '../store';
const moment = require('moment');
moment.locale('zh-cn',{}); // 使用中文

import {  selectByMessageId} from '../db/ChatMessageModel';
//express服务器
const express = require('express');
const expressServer = express();

const cover_img_suffix = "_cover.png";
const image_suffix = ".png";

const ffprobePath = "/assets/ffprobe.exe";
const ffmpegPath = "/assets/ffmpeg.exe";

const getDomain = ()=>{
    return NODE_ENV !== "development" ? store.getData()("prodDomain") : store.getData("devDomain");
}


const mkdirs = (dir)=>{
    if(!fs.existsSync(dir)){
        const parentDir = path.dirname(dir);
        if(!fs.existsSync(parentDir)){
            mkdirs(parentDir);
        }
        fs.mkdirSync(dir);
    }
} 

const getResourcesPath = ()=>{
    let resourcesPath = app.getAppPath();
    if(NODE_ENV !== "development"){
        resourcesPath = path.dirname(app.getPath('exe') + "/resources");
    }
    return resourcesPath;
}

const getFFprobePath = ()=>{
    return path.join(getResourcesPath(),ffprobePath);
}

const getFFmegPath = ()=>{
    return path.join(getResourcesPath(),ffmpegPath);
}

const saveFile2Local = (messageId,filePath,fileType)=>{
    return new Promise(async(resolve,reject)=>{
        let ffmpegPath = getFFmegPath();
        let savePath = await getLocalFilePath("chat",false,messageId);
        fs.copyFileSync(filePath,savePath);
        let coverPath = null;
        if(fileType != 2){
            let command = `${getFFprobePath()} -v error -select_streams v:0 -show_entries stream=codec_name "${filePath}"`;
            let result = await execCommand(command);
            result = result.replaceAll("\r\n","");
            result = result.substring(result.lastIndexOf("=")+1);
            let codec = result.substring(0,result.indexOf("["));
            if(codec == "hevc"){//如果是h265
                command = `${ffmpegPath} -i "${filePath}" -c:v libx264 -crf 20 "${savePath}"`;
                await execCommand(command);
            }
            coverPath = savePath + cover_img_suffix;
            command = `${ffmpegPath} -i "${savePath}" -vframes 1 -vf "scale=170:170:force_original_aspect_ratio=decrease" "${coverPath}"`;
            await execCommand(command);
        }
        uploadFile(messageId,savePath,coverPath);
        resolve();
    })
}

const uploadFile = (messageId,savePath,coverPath)=>{
    const formData = new FormData();
    formData.append("messageId",messageId);
    formData.append("file",fs.createReadStream(savePath));
    if(coverPath){
        formData.append("cover",fs.createReadStream(coverPath));
    }

    const url = `${getDomain()}/api/chat/uploadFile`;//根据环境区分
    const token = store.getUserData("token");
    const config = {headers : {'Content-Type' : 'multipart/form-data',"token" : token}}
    axios.post(url,formData,config).then((res)=>{
        
    }).catch((err)=>{
        console.log("文件上传失败",err);
    })
}


const execCommand = (command)=>{
    return new Promise((resolve,reject)=>{
        exec(command,(error,stdout,stderr)=>{
            console.log("ffmpeg命令",command)
            if(error){
                console.log("error",error);
            }else{
                resolve(stdout);
            }
        })
    })
}


const getLocalFilePath = (partType,showCover,fileId)=>{
    return new Promise(async(resolve,reject)=>{
        let localFolder = store.getUserData("localFileFolder");
        let localPath = null;
        if(partType == "avatar"){
            localFolder = localFolder + "/avatar/";
            if(!fs.existsSync(localFolder)){
                mkdirs(localFolder);
            }
            localPath = localFolder + fileId + image_suffix;
        }else if(partType == "chat"){
            let messageInfo = await selectByMessageId(fileId);//找到文件
            const month = moment(Number.parseInt(messageInfo.sendTime)).format("YYYYMM");//转化时间
            localFolder = localFolder + "/" + month;
            if(!fs.existsSync(localFolder)){//如果不存在文件夹，就创建文件夹,fs不能全部创建，只能一层一层创建
                mkdirs(localFolder);//递归的创建
            }
            let fileSuffix = messageInfo.fileName;
            fileSuffix = fileSuffix.substring(fileSuffix.lastIndexOf("."));//截取后缀名 
            localPath = localFolder + "/" + fileId + fileSuffix;
        }else if(partType == "tmp"){//为剪切板文件处理
            localFolder = localFolder + "/tmp/";
            if(!fs.existsSync(localFolder)){
                mkdirs(localFolder);
            }
            localPath = localFolder + "/" + fileId;
        }
        if(showCover){
            localPath = localPath + cover_img_suffix;
        }

        resolve(localPath);
    })
}

let server = null;
const startLocalServer = (serverPort)=>{
    server = expressServer.listen(serverPort,()=>{
        console.log(`服务已经在本地 ${serverPort} 启动`)
    })
}

const FILE_TYPE_CONTENT_TYPE = {
    "0": "image/", // 图片
    "1": "video/", 
    "2": "application/octet-stream", 
}

expressServer.get('/file',async(req,res)=>{
    let {partType,fileType,fileId,showCover,forceGet} = req.query;
    if(!partType || !fileId){
        res.send("请求参数错误");
        return;
    }
    showCover = showCover == undefined ? false : Boolean(showCover);
    const localPath = await getLocalFilePath(partType,showCover,fileId);
    if(!fs.existsSync(localPath) || forceGet == "true"){
       if(forceGet == "true" && partType == "avatar"){
           await downloadFile(fileId,true,localPath + cover_img_suffix,partType);
       }
       await downloadFile(fileId,showCover,localPath,partType);
    }

    const fileSuffix = localPath.substring(localPath.lastIndexOf(".") + 1);//截取后缀名
    let contentType = FILE_TYPE_CONTENT_TYPE[fileType] + fileSuffix;
    res.setHeader('Access-Control-Allow-Origin', '*')//允许跨域
    res.setHeader('Content-Type',contentType);
    if(showCover || fileType != 1){
        fs.createReadStream(localPath).pipe(res);
        return;
    }//如果不是视频，直接返回流
    //如果是视频，为了实现拖动功能，需要特殊处理
    let state = fs.statSync(localPath);
    let fileSize = state.size;
    let range = req.headers.range;
    if(range){
        let parts = range.replace(/bytes=/, "").split("-");
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : start + 999999;
        end = end > fileSize - 1 ? fileSize - 1 : end;
        let chunksize = (end - start) + 1;
        let stream = fs.createReadStream(localPath, {start, end});
        let head = {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': "video/mp4",
        }
        res.writeHead(206, head);
        stream.pipe(res);
    }else{
        let head = {
            'Content-Length': fileSize,
            'Content-Type': "video/mp4",
        }
        res.writeHead(200, head);
        fs.createReadStream(localPath).pipe(res);
    }
   
})
//从服务器下载文件
const downloadFile = (fileId,showCover,savePath,partType)=>{
    showCover = showCover + "";
    let url = `${getDomain()}/api/chat/downloadFile`
    const token = store.getUserData("token");
    return new Promise(async(resolve,reject)=>{
        const config = {
            responseType: "stream",
            headers : {'Content-Type' : 'multipart/form-data',"token" : token}
        }
        let response = await axios.post(
            url,{
                fileId,
                showCover,
            },config
        );
        const folder = savePath.substring(0,savePath.lastIndexOf("/"));
        mkdirs(folder);
        const stream = fs.createWriteStream(savePath);
        if(response.headers['content-type'] == "application/json"){//如果是json，可能有问题
            let resourcesPath = getResourcesPath();
            if(partType == "avatar"){//如果是头像
                fs.createReadStream(resourcesPath + "/assets/user.png").pipe(stream);    
            }else{
                fs.createReadStream(resourcesPath + "/assets/404.png").pipe(stream);
            }    
        }else{
            //没有问题就是标准的流
            response.data.pipe(stream);
        }
        stream.on("finish",()=>{
            stream.close();
            resolve();
        })
    })
}

const closeLocalServer = ()=>{
    if(server){
        server.close();
    }
}

const createCover = (filePath)=>{
    return new Promise(async(resolve,reject)=>{
        console.log("filePath: ",filePath)
        let ffmpegPath = getFFmegPath();
        let avatarPath = await getLocalFilePath("avatar",false,store.getUserId() + "_temp");
        let command = `${ffmpegPath} -i "${filePath}" "${avatarPath}" -y`
        await execCommand(command);

        let coverPath = await getLocalFilePath("avatar",false,store.getUserId() + "_temp_cover");
        command = `${ffmpegPath} -i "${filePath}" -vframes 1 -vf "scale=170:170:force_original_aspect_ratio=decrease" "${coverPath}"`;
        await execCommand(command);

        resolve({
            avatarStream:fs.readFileSync(avatarPath),
            coverStream:fs.readFileSync(coverPath)
        })
    })
}

const saveAs = async({partType,fileId})=>{
    let fileName = "";
    if(partType == "avatar"){//头像
        fileName = fileId + image_suffix;
    }else if(partType == "chat"){//聊天文件
        let messageInfo = await selectByMessageId(fileId);//找到文件
        fileName = messageInfo.fileName; 
    }

    const localPath = await getLocalFilePath(partType,false,fileId);
    const options = {
        title: '保存文件',
        defaultPath: fileName,
    }
    let result = await dialog.showSaveDialog(options);
    if(result.canceled || result.filePath == ""){//取消{
        return;
    }
    const filePath = result.filePath;
    fse.copyFileSync(localPath,filePath);
}


const saveClipBoardFile = async(file)=>{
    const fileSuffix = file.name.substring(file.name.lastIndexOf("."));//截取后缀名
    const filePath = await getLocalFilePath("tmp",false,"tmp" + fileSuffix);
    let byteArray = file.byteArray
    const buffer = Buffer.from(byteArray);
    fs.writeFileSync(filePath,buffer);
    return {
        size:byteArray.length,
        name:file.name,
        path:filePath,
    }
}

export {
    saveFile2Local,
    startLocalServer,
    closeLocalServer,
    createCover,
    saveAs,
    saveClipBoardFile,
}