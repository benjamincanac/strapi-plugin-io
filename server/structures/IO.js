'use strict';

const { Server } = require('socket.io');
const { handshake } = require('../middlewares/handshake');
const { getModelMeta } = require('../utils/getModelMeta');

class IO {
	constructor(options) {
		this._socket = new Server(strapi.server.httpServer, options);
		this._socket.use(handshake);
	}

	// eslint-disable-next-line class-methods-use-this
	_buildEventName(model) {
		const { apiName, action } = getModelMeta(model);
		return `${apiName}:${action}`;
	}

	/**
	 * Retrieves all strapi rooms (roles).
	 *
	 */
	// eslint-disable-next-line class-methods-use-this
	_getStrapiRooms() {
		return strapi.entityService.findMany('plugin::users-permissions.role', {
			fields: ['name'],
			populate: {
				permissions: {
					fields: ['action'],
				},
			},
		});
	}

	/**
	 * Emits an event to all roles that have permission to access the specified model.
	 *
	 * @param {string} model The model uid
	 * @param {object} entity The entity record data
	 */
	async emit(model, entity) {
		const event = this._buildEventName(model);
		const rooms = await this._getStrapiRooms();

		for (const room of rooms) {
			if (room.permissions.find((per) => per.action === model)) {
				this._socket.to(room.name).emit(event, entity);
			}
		}
	}

	/**
	 * Emits an event with no additional validation
	 *
	 * @param {string} event The event to emit
	 * @param {any} data The data to emit
	 * @param {object} options Additional emit options
	 * @param {string} options.room The room to emit to
	 */
	async raw(event, data, options = {}) {
		const { room } = options;
		let emitter = this._socket;
		if (room && room.length) {
			emitter = emitter.to(room);
		}
		emitter.emit(event, data);
	}

	/**
	 *  Returns the server socket
	 */
	get socket() {
		return this._socket;
	}
}

module.exports = {
	IO,
};
