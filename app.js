const express = require('express');
const app = express();
const { Cluster } = require('puppeteer-cluster');
const path = require('path');
const fs = require('fs-extra');
const basedir="/data/";
const now_time = new Date().toLocaleString();
(async () => {

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        puppeteerOptions: {
            headless: true,
            ignoreHTTPSErrors: true,
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-sandbox',
                '--no-zygote'
            ]
        },
        maxConcurrency: 2,
    });

    // setup server
    app.get('/', async function (req, res) {
        var action = req.query.action||"screenshot";
        var url = req.query.url||"";
        var imgpath = req.query.imgpath||"pic/1.jpg";
        var real_imgpath = basedir+imgpath;
        var try_execute = async function(url,real_imgpath,num){
            try {
                const result = await cluster.execute({url,real_imgpath},async ({ page, data: params}) => {

                        console.log(params)

                        await page.goto(params.url,{
                            timeout: 15000,
                            waitUntil: ['networkidle0']
                        });

                        await page.waitFor(2000);

                        // 自定义截屏参数
                        await page.screenshot({
                            path: params.real_imgpath,
                            clip:{
                                    x:0,
                                    y:0,
                                    width:2480,
                                    height:3508
                                }
                        });

                        await page.close();

                        return "success";
                    });
                console.log("result: "+result)
            } catch (err) {
                // catch error
                console.log('Error: ' + err.message);
                num--;
                if(num>0){
                    console.log('retry: ' + num);
                    await try_execute(url,real_imgpath,num);
                }
            }
        }
        if(action=="screenshot"){
            var imgdir = path.dirname(real_imgpath);
            if (!fs.existsSync(imgdir)) {
              fs.ensureDirSync(imgdir);
            }
            if (!req.query.url) {
                return res.end('error');
            }

            await try_execute(url,real_imgpath,5);

            res.end("success");
        }else{
            console.log(now_time+" not exists action");
            res.writeHead(404);
            res.end('404 Not Found');
        }
    });

    app.listen(3000, function () {
        console.log('Screenshot server listening on port 3000.');
    });
})();
