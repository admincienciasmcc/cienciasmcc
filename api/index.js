'use strict';

/* Ponto de entrada no Vercel: exporta o app; a plataforma cuida do resto. */

const { criarApp } = require('../src/app');

module.exports = criarApp();
