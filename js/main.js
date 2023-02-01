var MAIN_URL="ws://:15565";//接口地址
let part = 3000;//刷新频率
let maxx = 5;//实时网速表格最多呈现的时间点个数

var websock = null;

function init(){
    websock = new WebSocket(MAIN_URL);
    websock.onmessage = onmessage;
    websock.onopen = onopen;
    websock.onclose = onclose;
}
function send_request(target){
    if(websock.readyState!=1){
        console.log("cann't send request:"+websock.readyState);
        return;
    }
    let data = {
        "target": target
    };
    websock.send(JSON.stringify(data));
    
}
function onmessage(data){
    data=JSON.parse(data.data);
    if(data.path=="/net"){
        data=data.data;
        $("#up_r").text("上传:"+String(data.up)+"KB/s");
        $("#down_r").text("下载:"+String(data.down)+"KB/s");
        if (now_cnt == maxx) {
            data_up.shift();
            data_down.shift();
        } else {
            now_cnt++;
        }
        data_up.push({value: [now.getTime(), data.up]});
        data_down.push({value: [now.getTime(), data.down]});
        update_time();
        myChart.setOption({
            series: [
                {
                    data: data_up
                },
                {
                    data: data_down
                }
            ]
        });
    }
    if(data.path=="/system"){
        var obj=data.data;;
        $("#system_name").text(obj.system);
        $("#system_time").text(obj.time);
        $("#system_cpu").text(String(obj.cpuRealUsed)+"%");
        $("#cpu_pro").css("width",String(Math.ceil(obj.cpuRealUsed))+"%");
        $("#system_ram").text(String(obj.memRealUsed)+"MB / "+String(obj.memTotal)+"MB");
        $("#ram_pro").css("width",String(Math.ceil(obj.memRealUsed/obj.memTotal*100))+"%");
    }
    if(data.path=="/usage"){
        data=data.data;
        $("#bw").text(String(data.bwusage)+"G / "+String(data.bwlimit)+"G");
        $("#bw_pro").css("width",String(Math.ceil(data.bwusage/data.bwlimit*100))+"%");
        $("#due_date").text(dayjs.unix(Number(data.nextduedate)).format('YYYY-MM-DD HH:mm:ss'));
    }
    if(data.path=="/disk"){
        data=data.data;
        $("#storage").text(data[0].size[1]+" / "+data[0].size[0]);
        $("#storage_pro").css("width",data[0].size[3]);
    }
}
function onopen(){
    $("#status").text("已连接");
    send_request("/system");
    send_request("/disk");
    send_request("/usage");
    send_request("/net");
}
function onclose(){
    $("#status").text("失去连接");
    mdui.snackbar({
        message: '失去连接，请刷新网页重新连接。',
        position: 'right-bottom',
    });
}

var dom = document.getElementById('container');
var myChart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
});
var app = {};
var option;

function update_time() {
    now.setTime(now.getTime() + part);
}

let data_up = [];
let data_down = [];
let now_cnt = 0;
let now = new Date();

option = {
    title: {
        text: '',
        left: 'center'
    },
    grid: {
        bottom: 80
    },
    toolbox: {
        feature: {
            saveAsImage: {}
        }
    },
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'cross',
            animation: false,
            label: {
                backgroundColor: '#505765'
            }
        }
    },
    legend: {
        data: ['上传', '下载'],
        left: 10
    },
    xAxis: [
        {
            type: 'time',
            boundaryGap: false,
            axisLine: { onZero: false },
            // prettier-ignore
        }
    ],
    yAxis: [
        {
            name: 'Kb/s',
            type: 'value'
        }
    ],
    series: [
        {
            name: '上传',
            type: 'line',
            showSymbol: false,
            smooth: true,
            areaStyle: {},
            lineStyle: {
                width: 1
            },
            emphasis: {
                focus: 'series'
            },
            // prettier-ignore
            data: data_up
        },
        {
            name: '下载',
            type: 'line',
            smooth: true,
            showSymbol: false,
            areaStyle: {},
            lineStyle: {
                width: 1
            },
            emphasis: {
                focus: 'series'
            },
            // prettier-ignore
            data: data_down
        }
    ]
};

if (option && typeof option === 'object') {
    myChart.setOption(option);
}
window.addEventListener('resize', myChart.resize);
init();
setInterval(function(){
    send_request("/net");
    send_request("/system");
},part)