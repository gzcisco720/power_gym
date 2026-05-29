import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { FatSecretService } from './fatsecret.service';

// ── Config factory ────────────────────────────────────────────────────────────

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const defaults: Record<string, string> = {
        FATSECRET_CLIENT_ID: 'test-id',
        FATSECRET_CLIENT_SECRET: 'test-secret',
        FATSECRET_CLIENT_AUTH_METHOD: 'oauth2',
      };
      // Use explicit key-in-check so passing undefined in overrides actually overrides the default
      return Object.prototype.hasOwnProperty.call(overrides, key)
        ? overrides[key]
        : defaults[key];
    }),
  };
}

// ── Response builders ─────────────────────────────────────────────────────────

function makeGramServing(overrides: Record<string, unknown> = {}) {
  return {
    serving_id: 's1',
    serving_description: '100 g',
    metric_serving_amount: '100',
    metric_serving_unit: 'g',
    calories: '165',
    protein: '31',
    carbohydrate: '0',
    fat: '3.6',
    ...overrides,
  };
}

function makeV5Response(foodOverrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        foods_search: {
          results: {
            food: [
              {
                food_id: '123',
                food_name: 'Chicken',
                food_type: 'Brand',
                brand_name: 'Tyson',
                servings: { serving: [makeGramServing()] },
                ...foodOverrides,
              },
            ],
          },
        },
      }),
    text: () => Promise.resolve(''),
  } as unknown as Response;
}

function makeV1Response() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        foods: {
          food: [
            {
              food_id: '456',
              food_name: 'Apple',
              food_type: 'Generic',
              servings: { serving: [makeGramServing()] },
            },
          ],
        },
      }),
    text: () => Promise.resolve(''),
  } as unknown as Response;
}

function makeTokenResponse() {
  return {
    ok: true,
    json: () => Promise.resolve({ access_token: 'tok', expires_in: 3600 }),
    text: () => Promise.resolve(''),
  } as unknown as Response;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FatSecretService', () => {
  let fetchSpy: jest.SpyInstance;

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('getProvider', () => {
    it('throws ServiceUnavailableException when client id/secret are not configured', () => {
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      } as unknown as Response);

      const service = new FatSecretService(
        makeConfig({
          FATSECRET_CLIENT_ID: undefined,
          FATSECRET_CLIENT_SECRET: undefined,
        }) as never,
      );
      expect(() => service['getProvider']()).toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('search', () => {
    it("selects the OAuth1 provider when FATSECRET_CLIENT_AUTH_METHOD === 'oauth1'", async () => {
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(makeV1Response());

      const service = new FatSecretService(
        makeConfig({ FATSECRET_CLIENT_AUTH_METHOD: 'oauth1' }) as never,
      );
      await service.search('apple');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [firstArgs] = fetchSpy.mock.calls as [string[]][];
      const calledUrl = firstArgs[0];
      expect(calledUrl).toContain('platform.fatsecret.com/rest/server.api');
    });

    it('selects the OAuth2 provider by default', async () => {
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(makeTokenResponse())
        .mockResolvedValueOnce(makeV5Response());

      const service = new FatSecretService(makeConfig() as never);
      await service.search('chicken');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const allCalls = fetchSpy.mock.calls as [string[]][];
      const secondCallUrl = allCalls[1][0];
      expect(secondCallUrl).toContain(
        'platform.fatsecret.com/rest/foods/search/v5',
      );
    });

    it('throws Error when the search response is not ok', async () => {
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(makeTokenResponse())
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: () => Promise.resolve('Forbidden'),
        } as unknown as Response);

      const service = new FatSecretService(makeConfig() as never);
      await expect(service.search('chicken')).rejects.toThrow(Error);
    });

    it('maps a v5 result food into FatSecretFood with a gram-based serving and macros', async () => {
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(makeTokenResponse())
        .mockResolvedValueOnce(makeV5Response());

      const service = new FatSecretService(makeConfig() as never);
      const results = await service.search('chicken');

      expect(results).toHaveLength(1);
      const food = results[0];
      expect(food.foodId).toBe('123');
      expect(food.name).toBe('Chicken');
      expect(food.brand).toBe('Tyson');
      expect(food.defaultServing.grams).toBe(100);
      expect(food.defaultServing.protein).toBe(31);
    });

    it('drops foods whose only serving is non-gram', async () => {
      fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(makeTokenResponse())
        .mockResolvedValueOnce(
          makeV5Response({
            servings: {
              serving: [makeGramServing({ metric_serving_unit: 'oz' })],
            },
          }),
        );

      const service = new FatSecretService(makeConfig() as never);
      const results = await service.search('chicken');

      expect(results).toEqual([]);
    });
  });
});
