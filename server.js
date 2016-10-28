var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	usuarios = {};

mongoose.connect('mongodb://murilo:lilo0202@ds023593.mlab.com:23593/bubble', function(err, res) {
	if(err){
		console.log(err);
	}else{
		console.log('Conectado a BD bubble');
	}
});

server.listen(3000, function() {
	console.log('Rodando na porta 3000');
});

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	criado: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);

io.sockets.on('connection', function(socket) {

	var query = Chat.find({});
	query.sort('-criado').exec(function(err, docs) {
		if (err) throw err;
		socket.emit('mensagens antigas', docs);
		console.log(docs)
	});

	function updateNicknames() {
		io.sockets.emit('usuarios', Object.keys(usuarios));
	}

	socket.on('novo usuario', function(data, callback) {
		if (data in usuarios) {
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			usuarios[socket.nickname] = socket;
			updateNicknames();
		}
	});

	socket.on('enviar mensagem', function(data, callback) {
		var msg = data.trim();
		if(msg.substr(0,3) === '/w ') {
			
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			
			if(ind !== -1) {
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				
				if(name in usuarios) {
					usuarios[name].emit('sussurro', {msg: msg, nick: socket.nickname})
				}else {
					callback('Erro! Insira um nickname válido');
				}
			} else {
				callback('Erro! Coloque a mensamensagem para seu amigo');
			}
		} else {
			io.sockets.emit('nova mensagem', {msg: data, nick: socket.nickname});
		}

		// Salvar no banco
		var newMsg = new Chat({msg: msg, nick: socket.nickname});
		newMsg.save(function(err) {
			if(err) throw err;
		})
	});

	socket.on('disconnect', function(data) {
		if(!socket.nickname) return;
		
		delete usuarios[socket.nickname];
		updateNicknames();
	});
});