from http.server import HTTPServer, BaseHTTPRequestHandler
import time
import hashlib
from requests import session
import json
import asyncio
import websockets
from datetime import datetime

### 监听的端口
config = {"address":'0.0.0.0', "port":15565}
### 宝塔的api密钥和请求地址
key=""
url="http://127.0.0.1:8233"

async def handler(websocket):
    while websocket.open:
        try:
            data = await websocket.recv()
        except (websockets.exceptions.ConnectionClosedError,websockets.exceptions.ConnectionClosedOK) as e:
            break
        obj = json.loads(data)
        buf = ""
        self= obj["target"]
        if(self=='/system'):
            buf = get_info()
        if(self=='/disk'):
            buf = get_disk()
        if(self=='/net'):
            buf = get_net()
        if(self=='/usage'):
            buf = get_usage()
        obj = json.loads(buf)
        if(("status" in obj) and obj["status"]==False):
            print("连接到宝塔接口时发生错误："+obj["msg"])
            exit()
        res={}
        res["path"]=self
        res["data"]=obj
        buf=json.dumps(res)
        await websocket.send(buf)
        print("GET "+self)
    print("Connection closed")

async def main():
    async with websockets.serve(handler, config['address'], config['port']):
        await asyncio.Future()

current_milli_time = lambda: int(round(time.time() * 1000))

def get_key():
    _time=current_milli_time()
    res={}
    res['request_token']=hashlib.md5((str(_time)+hashlib.md5(key.encode()).hexdigest()).encode()).hexdigest()
    res['request_time']=_time
    return res

sess = session()
def get_info():
    _url=url+"/system?action=GetSystemTotal"
    _data=get_key()
    return sess.post(url=_url,data=_data).text
def get_disk():
    _url=url+"/system?action=GetDiskInfo"
    _data=get_key()
    return sess.post(url=_url,data=_data).text
def get_net():
    _url=url+"/system?action=GetNetWork"
    _data=get_key()
    return sess.post(url=_url,data=_data).text

### 下面是从运营商处获得服务器剩余流量信息，请根据自身情况实现  
### 下面的是“青云互联”的接口实现
def do_login():
    _url="https://www.qyidc.net/login?action=phone"

    ### 此处填对应账号密码
    _data="phone=&password="
    _res=sess.post(url=_url,data=_data,allow_redirects=False)
    if(_res.status_code==302):
        print("login successfully!")
    else:
        print("login failed!")
def get_usage():
    _url="https://www.qyidc.net/host/dedicatedserver?host_id=72425"
    _res=sess.get(url=_url)
    obj=json.loads(_res.text)
    if(obj['status']==405):
        do_login()
        _res=sess.get(url=_url)
        obj=json.loads(_res.text)
    data={}
    data["nextduedate"]=obj['data']['host_data']['nextduedate']
    data["bwusage"]=obj['data']['host_data']['bwusage']
    data["bwlimit"]=obj['data']['host_data']['bwlimit']
    return json.dumps(data)

if __name__ == '__main__':
    asyncio.run(main())