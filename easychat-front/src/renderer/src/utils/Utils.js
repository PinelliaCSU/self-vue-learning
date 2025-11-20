import moment from "moment";

const isEmpty = (str)=>{
    if(str == null || str == "" || str == undefined){
        return true;
    }
    return false;
}

const getAreaInfo = (data)=>{
    if(isEmpty(data)){
        return '-';
    }
    return data.replace(","," ");
}

const formatDate = (timestamp)=>{
    const timestampTime = moment(timestamp);
    const days = Number.parseInt(moment().format("YYYYYMMDD")) - Number.parseInt(timestampTime.format("YYYYYMMDD"));
    if(days == 0){
        return timestampTime.format("HH:mm");
    }else if(days == 1){
        return "昨天 "
    }else if(days >= 2 && days < 7){
        return timestampTime.format("dddd"); 
    }else if(days >= 7){
        return timestampTime.format("YY/MM/DD"); //其他
    }
}
const size2Str = (limit) => {
    var size = "";
    if (limit < 0.1 * 1024) {
        size = limit.toFixed(2) + "B"
    } else if (limit < 1024 * 1024) {
        size = (limit / 1024).toFixed(2) + "KB"
    } else if (limit < 1024 * 1024 * 1024) {
        size = (limit / (1024 * 1024)).toFixed(2) + "MB"
    } else {
        size = (limit / (1024 * 1024 * 1024)).toFixed(2) + "GB"
    }
    var sizeStr = size + "";
    var index = sizeStr.indexOf(".");
    var dou = sizeStr.substring(index + 1, index + 3)
    if (dou == "00") {
        return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2)
    }
    return size;
    //小于0.1KB，则转化成B
    //小于0.1MB，则转化成KB
}
export default {
    isEmpty,
    getAreaInfo,
    formatDate,
    size2Str
}


