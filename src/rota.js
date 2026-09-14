'use strict';

/* =========================================================================
   Router do Express com manipuladores assíncronos seguros.

   No Express 4, se um manipulador async rejeita, ninguém captura: o Node
   derruba o processo. Aqui cada função registrada é envolvida para que a
   rejeição siga para o tratador de erros e vire uma página de erro.
   ========================================================================= */

const express = require('express');

const METODOS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];

function envolver(fn) {
  if (typeof fn !== 'function') return fn;

  // tratador de erro do Express: assinatura de quatro argumentos
  if (fn.length === 4) {
    return function (err, req, res, next) {
      return Promise.resolve(fn(err, req, res, next)).catch(next);
    };
  }
  return function (req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function criarRouter(opcoes) {
  const router = express.Router(opcoes);

  for (const metodo of METODOS) {
    const original = router[metodo].bind(router);
    router[metodo] = (...args) => original(...args.map(envolver));
  }

  return router;
}

module.exports = { criarRouter, envolver };
