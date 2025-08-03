const inputFormats = {
      'base64': { label: 'Base64', process: input => atob(input) },
      'base16': { label: 'Base16', process: input => input.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('') },
      'binary': { label: 'Binary', process: input => input.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('') },
      'hex': { label: 'Hex', process: input => input.match(/.{1,2}/g).map(h => String.fromCharCode(parseInt(h, 16))).join('') },
      'ascii': { label: 'ASCII', process: input => input },
      'utf8': { label: 'UTF-8', process: input => decodeURIComponent(escape(input)) }
    };

    const outputFormats = {
      'utf8': { label: 'UTF-8', process: input => decodeURIComponent(escape(input)) },
      'ascii': { label: 'ASCII', process: input => input },
      'base64': { label: 'Base64', process: input => btoa(input) },
      'base16': { label: 'Base16', process: input => [...input].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') },
      'binary': { label: 'Binary', process: input => [...input].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ') }
    };

    function caesar(text, shift, mode = 'decrypt') {
      if (mode === 'encrypt') shift = -shift;
      return text.replace(/[a-z]/gi, c => {
        let base = c >= 'a' && c <= 'z' ? 97 : 65;
        return String.fromCharCode((c.charCodeAt(0) - base + shift + 26) % 26 + base);
      });
    }

    function vigenere(text, key, mode = 'decrypt') {
      let result = '', j = 0;
      for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (/[a-z]/i.test(c)) {
          let shift = key.charCodeAt(j % key.length) - 97;
          if (mode === 'encrypt') shift = -shift;
          let base = c >= 'a' && c <= 'z' ? 97 : 65;
          result += String.fromCharCode((c.charCodeAt(0) - base + shift + 26) % 26 + base);
          j++;
        } else {
          result += c;
        }
      }
      return result;
    }

    document.getElementById('inputText').addEventListener('input', runPipeline);

    function addBlock(type = 'convert') {
      const container = document.createElement('div');
      container.className = 'block';
      container.draggable = true;

      let innerHTML = `<div class="block-number"></div><button class="remove-btn" onclick="this.parentElement.remove(); runPipeline(); updateBlockNumbers();">&times;</button>`;

      if (type === 'convert') {
        const blocks = document.querySelectorAll('#pipeline .block');
        let defaultInput = 'utf8';
        if (blocks.length > 0) {
          const last = blocks[blocks.length - 1];
          const lastOutput = last.querySelector('.output-type');
          if (lastOutput) defaultInput = lastOutput.value;
        }

        innerHTML += `
          <label>Input As</label>
          <select class="input-type">
            ${Object.keys(inputFormats).map(k => `<option value="${k}" ${k === defaultInput ? 'selected' : ''}>${inputFormats[k].label}</option>`).join('')}
          </select>
          <label>Output As</label>
          <select class="output-type">
            ${Object.keys(outputFormats).map(k => `<option value="${k}">${outputFormats[k].label}</option>`).join('')}
          </select>
        `;
      } else if (type === 'cipher') {
        innerHTML += `
          <label>Cipher</label>
          <select class="cipher-type">
            <option value="caesar">Caesar</option>
            <option value="vigenere">Vigenère</option>
          </select>
          <label>Mode</label>
          <select class="cipher-mode">
            <option value="decrypt">Decrypt</option>
            <option value="encrypt">Encrypt</option>
            <option value="bruteForce">Brute Force</option>
          </select>
          <input type="text" class="cipher-key" placeholder="Enter shift/key" />
          <div class="brute-force-shifts"></div>
        `;
      }

      innerHTML += `<div class="block-output"></div>`;
      container.innerHTML = innerHTML;

      container.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', null);
        container.classList.add('dragging');
      });
      container.addEventListener('dragend', () => {
        container.classList.remove('dragging');
        updateBlockNumbers();
        runPipeline();
      });
      container.addEventListener('dragover', e => e.preventDefault());
      container.addEventListener('drop', e => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (dragging && dragging !== container) {
          pipeline.insertBefore(dragging, container);
          updateBlockNumbers();
          runPipeline();
        }
      });

      container.querySelectorAll('select, input').forEach(el => {
        el.addEventListener('input', runPipeline);
        el.addEventListener('change', runPipeline);
      });

      document.getElementById('pipeline').appendChild(container);
      updateBlockNumbers();
      runPipeline();
    }

    function updateBlockNumbers() {
      document.querySelectorAll('#pipeline .block').forEach((block, index) => {
        block.querySelector('.block-number').textContent = index + 1;
      });
    }
function runPipeline() {
  let current = document.getElementById('inputText').value;
  const blocks = document.querySelectorAll('#pipeline .block');
  let hasError = false;

  blocks.forEach((block, index) => {
    const outputEl = block.querySelector('.block-output');
    const bfContainer = block.querySelector('.brute-force-shifts');
    block.dataset.output = '';

    if (hasError) {
      outputEl.textContent = '[Skipped due to previous error]';
      return;
    }

    try {
      const inputAtThisBlock = current;

      if (block.querySelector('.input-type')) {
        const inputType = block.querySelector('.input-type').value;
        const outputType = block.querySelector('.output-type').value;
        current = inputFormats[inputType].process(current);
        current = outputFormats[outputType].process(current);
        outputEl.textContent = current;
      } else {
        const cipher = block.querySelector('.cipher-type').value;
        const mode = block.querySelector('.cipher-mode').value;
        const key = block.querySelector('.cipher-key').value;

        if (cipher === 'caesar') {
          if (mode === 'bruteForce') {
            bfContainer.innerHTML = '';
            let selectedShift = block.dataset.selectedShift ? parseInt(block.dataset.selectedShift) : 0;

            for (let shift = 0; shift < 26; shift++) {
              const out = caesar(inputAtThisBlock, shift, 'decrypt');
              const span = document.createElement('span');
              span.textContent = `Shift ${shift}: ${out.substring(0, 30)}`;
              span.className = 'brute-force-shift';
              if (shift === selectedShift) {
                span.classList.add('selected');
              }
              span.onclick = () => {
                block.dataset.selectedShift = shift;
                runPipeline(); // rerun with new selection
              };
              bfContainer.appendChild(span);
            }

            current = caesar(inputAtThisBlock, selectedShift, 'decrypt');
            outputEl.textContent = current;

          } else {
            current = caesar(current, parseInt(key), mode);
            outputEl.textContent = current;
          }
        } else if (cipher === 'vigenere') {
          current = vigenere(current, key, mode);
          outputEl.textContent = current;
        }
      }

      block.dataset.output = current;
    } catch (e) {
      current = `[Error: ${e.message}]`;
      hasError = true;
      outputEl.textContent = current;
    }
  });

  document.getElementById('output').textContent = current;
}
