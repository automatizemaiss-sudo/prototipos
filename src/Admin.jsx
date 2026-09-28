import React, { useState } from "react";
import { brands } from "../config/brands.js";
export default function Admin({ brand, onBrandChange }) {
  const [message, setMessage] = useState("");
  function select(id) {
    try {
      onBrandChange(id);
      setMessage("Visualização salva neste navegador.");
    } catch {
      setMessage(
        "Não foi possível salvar a escolha. Verifique se o armazenamento do navegador está disponível.",
      );
    }
  }
  return (
    <section className="panel admin-panel">
      <h2>Visualização do CRM</h2>
      <p>
        Alterne entre Flying Imports e FUTPB. Contatos, campanhas, históricos e
        integrações são compartilhados.
      </p>
      <fieldset className="brand-options">
        <legend>Escolha a marca neste navegador</legend>
        {Object.values(brands).map((item) => (
          <label
            key={item.id}
            className={
              brand.id === item.id ? "brand-option selected" : "brand-option"
            }
          >
            <input
              type="radio"
              name="visual-brand"
              value={item.id}
              checked={brand.id === item.id}
              onChange={() => select(item.id)}
            />
            <img src={item.logo} alt={`Logo ${item.name}`} />
            <span>{item.title}</span>
          </label>
        ))}
      </fieldset>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <p>
        A escolha fica salva neste navegador. Outros visitantes podem escolher
        sua própria visualização.
      </p>
      <p>
        Trocar a marca não envia mensagens nem modifica os dados. Rascunhos e
        mensagens existentes mantêm seu conteúdo.
      </p>
    </section>
  );
}
