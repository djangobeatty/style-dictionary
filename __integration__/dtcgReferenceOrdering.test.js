/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
import { expect } from 'chai';
import StyleDictionary from 'style-dictionary';
import { restore, stubMethod } from 'hanbi';

/**
 * The exact token set from the ticket: a plain token followed by a token that
 * references it. Declaration-order-sensitive languages must emit `colors.red`
 * before `colors.primary`.
 */
const dtcgTicketTokens = {
  colors: {
    red: { $value: '#ff0000', $type: 'color' },
    primary: { $value: '{colors.red}', $type: 'color' },
  },
};

const v3TicketTokens = {
  colors: {
    red: { value: '#ff0000', type: 'color' },
    primary: { value: '{colors.red}', type: 'color' },
  },
};

/**
 * A three level chain: brand -> primary -> red. The tokens are deliberately
 * declared in an order that is neither the correct dependency order nor its
 * reverse, so neither traversal order nor a blind reversal can satisfy it.
 */
const dtcgChainTokens = {
  colors: {
    primary: { $value: '{colors.red}', $type: 'color' },
    red: { $value: '#ff0000', $type: 'color' },
    brand: { $value: '{colors.primary}', $type: 'color' },
  },
};

const v3ChainTokens = {
  colors: {
    primary: { value: '{colors.red}', type: 'color' },
    red: { value: '#ff0000', type: 'color' },
    brand: { value: '{colors.primary}', type: 'color' },
  },
};

const makePlatform = () => ({
  transforms: ['name/kebab'],
  options: {
    outputReferences: true,
    showFileHeader: false,
  },
  files: [
    { destination: 'variables.scss', format: 'scss/variables' },
    { destination: 'variables.css', format: 'css/variables' },
  ],
});

const formatTokens = async (tokens) => {
  const sd = new StyleDictionary({
    tokens,
    platforms: { web: makePlatform() },
  });
  const outputs = await sd.formatPlatform('web');
  const byDestination = {};
  outputs.forEach(({ destination, output }) => {
    byDestination[destination] = output;
  });
  return byDestination;
};

/**
 * Asserts that every marker is present in the output and that they appear
 * in exactly the given order.
 */
const expectDeclarationOrder = (output, markers) => {
  const indices = markers.map((marker) => {
    const index = output.indexOf(marker);
    expect(index, `expected output to contain "${marker}", got:\n${output}`).to.be.greaterThan(-1);
    return index;
  });
  for (let i = 1; i < indices.length; i++) {
    expect(
      indices[i],
      `"${markers[i]}" must be declared after "${markers[i - 1]}", got:\n${output}`,
    ).to.be.greaterThan(indices[i - 1]);
  }
};

describe('integration', () => {
  beforeEach(() => {
    stubMethod(console, 'log');
  });

  afterEach(() => {
    restore();
  });

  describe('DTCG reference ordering', () => {
    it('should declare a referenced DTCG token before the token that references it', async () => {
      const dtcg = await formatTokens(dtcgTicketTokens);

      expect(dtcg['variables.scss']).to.equal(
        '$colors-red: #ff0000;\n$colors-primary: $colors-red;\n',
      );
      expect(dtcg['variables.css']).to.equal(
        ':root {\n  --colors-red: #ff0000;\n  --colors-primary: var(--colors-red);\n}\n',
      );
    });

    it('should produce the same output for DTCG tokens as for the equivalent v3 tokens', async () => {
      const dtcg = await formatTokens(dtcgTicketTokens);
      const v3 = await formatTokens(v3TicketTokens);

      expect(dtcg['variables.scss']).to.equal(v3['variables.scss']);
      expect(dtcg['variables.css']).to.equal(v3['variables.css']);
    });

    it('should emit multi-level DTCG reference chains in dependency order', async () => {
      const dtcg = await formatTokens(dtcgChainTokens);

      expectDeclarationOrder(dtcg['variables.scss'], [
        '$colors-red:',
        '$colors-primary:',
        '$colors-brand:',
      ]);
      expect(dtcg['variables.scss']).to.include('$colors-primary: $colors-red;');
      expect(dtcg['variables.scss']).to.include('$colors-brand: $colors-primary;');

      expectDeclarationOrder(dtcg['variables.css'], [
        '--colors-red:',
        '--colors-primary:',
        '--colors-brand:',
      ]);
      expect(dtcg['variables.css']).to.include('--colors-primary: var(--colors-red);');
      expect(dtcg['variables.css']).to.include('--colors-brand: var(--colors-primary);');
    });

    it('should order multi-level DTCG chains the same way as the equivalent v3 chain', async () => {
      const dtcg = await formatTokens(dtcgChainTokens);
      const v3 = await formatTokens(v3ChainTokens);

      expect(dtcg['variables.scss']).to.equal(v3['variables.scss']);
      expect(dtcg['variables.css']).to.equal(v3['variables.css']);
    });
  });
});
