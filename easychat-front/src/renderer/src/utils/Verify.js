const regs = {
    email:/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    number:/^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/,
    password:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-=+])[A-Za-z\d!@#$%^&*_\-=+]{8,}$/,
    version:/^\d+(?:\.\d+){0,2}(?:[-.]?(?:alpha|beta|rc\d*|\d+))?$/
}

const verify = (rule,value,reg,callback)=>{
    if(value){
        if(reg.test(value)){
            callback()
        }else{
            callback(new Error(rule.message))
        }
    }else{
        callback()
    }
}

const checkPassword = (value)=>{
    return regs.password.test(value)
}
const checkEmail = (value)=>{
    return regs.email.test(value)
}

const password = (rule,value,callback)=>{
    return verify(rule,value,regs.password,callback)
}

const number = (rule,value,callback)=>{
    return verify(rule,value,regs.number,callback)
}

export default {
    checkPassword,
    checkEmail,
    password,
    number
}