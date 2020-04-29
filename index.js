#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const resolve = (dir, d = __dirname) => path.join(d, dir);
const slog = require('single-line-log').stdout;
const tinify = require("tinify");
const program = require('commander');
const chalk = require('chalk');

const PATH = process.cwd();

let num = 0;
let total = 0;

//遍历目录压缩
function run(dirPath) {
	const files = fs.readdirSync(dirPath);
	files.forEach(function (file, index) {
		const _filePath = dirPath + path.sep + file;
		fs.stat(_filePath, function (err, stat) {
			const _size = stat.size;
			if (stat.isFile() && checkImg(_filePath)) {
				runFile(_filePath, _size)
			} else if (stat.isDirectory()) {
				run(_filePath)
			}
		});
	});
}

//压缩图片
function runFile(_filePath, _size) {
	fs.readFile(_filePath, function (err, sourceData) {
		tinify.fromBuffer(sourceData).toBuffer(function (err, resultData) {
			if (err) throw err;
			fs.writeFileSync(_filePath, resultData, 'utf8');
			const _newSize = fs.statSync(_filePath).size;
			pb.render({
				completed: ++num,
				total: total,
				cnt: `${_filePath.replace(PATH, '')} ----- ${_size}b => ${_newSize}b ${Math.floor((_size - _newSize) / _size * 10000) / 100}%`
			});
		});
	});
}

//校验是否是图片
function checkImg(file) {
	const extname = path.extname(file);
	return ['.jpg', '.jpeg', '.png', '.gif'].includes(extname);
}

// 封装的 ProgressBar 工具
function ProgressBar(description, bar_length) {
	// 两个基本参数(属性)
	this.description = description || 'Progress';       // 命令行开头的文字信息
	this.length = bar_length || 25;                     // 进度条的长度(单位：字符)，默认设为 25
	this.cnt = '';

	// 刷新进度条图案、文字的方法
	this.render = function (opts) {
		var percent = (opts.completed / opts.total).toFixed(4);    // 计算进度(子任务的 完成数 除以 总数)
		var cell_num = Math.floor(percent * this.length);             // 计算需要多少个 █ 符号来拼凑图案

		// 拼接黑色条
		var cell = '';
		for (var i = 0; i < cell_num; i++) {
			cell += '█';
		}

		// 拼接灰色条
		var empty = '';
		for (var i = 0; i < this.length - cell_num; i++) {
			empty += '░';
		}

		// 拼接最终文本
		if (opts.cnt) this.cnt = this.cnt + opts.cnt + '\n\r\n\r';
		var cmdText = this.cnt + this.description + ': ' + (100 * percent).toFixed(2) + '% ' + cell + empty + ' ' + opts.completed + '/' + opts.total;

		// 在单行输出文本
		slog(cmdText);
	};
}

const pb = new ProgressBar('压缩进度');
//获取图片总数
function imgcount(dirPath) {
	const files = fs.readdirSync(dirPath);
	files.forEach(function (file, index) {
		const _filePath = dirPath + path.sep + file;
		const statSync = fs.statSync(_filePath);
		if (statSync.isFile() && checkImg(_filePath)) {
			total++;
		} else if (statSync.isDirectory()) {
			imgcount(_filePath)
		}
	});
}

//开始执行
function start(path = null) {
	const _path = path ? resolve(path, PATH) : PATH;
	const existsSync = fs.existsSync(_path);
	if (!existsSync) {
		return console.log(`  ` + chalk.red(`错误：目录不存在`));
	}
	if (checkImg(_path)) {
		fs.stat(_path, function (err, stat) {
			const _size = stat.size;
			total = 1;
			pb.render({ completed: num, total });
			runFile(_path, _size);
		});
	} else {
		imgcount(_path);
		pb.render({ completed: num, total: total });
		run(_path);
	}
}

const CONFIG_PATH = resolve('./config.json');
program
	.name("tinifycli")
	.version(`${require('./package').version}`)
	.usage('<command> [options]')
	.option('set-key <key>', '设置通过tinifyPNG获取的key', PATH)
	.option('run [path]', '运行压缩');

program
	.command('set-key <key>').action((key) => {
		fs.writeFileSync(
			CONFIG_PATH,
			JSON.stringify({
				key
			})
		);
	});

program
	.command('run [path]')
	.action((path) => {
		const existsSync = fs.existsSync(CONFIG_PATH);
		if (existsSync) {
			const configJSON = fs.readFileSync(CONFIG_PATH);
			const { key } = JSON.parse(configJSON);
			tinify.key = key;
			start(path);
		} else {
			console.log(`  ` + chalk.yellow(`警告：设置通过tinifyPNG获取的key，并使用set-key命令设置key`))
		}
	});

program.arguments('[command]').action(() => {
	program.outputHelp()
});

program.parse(process.argv);