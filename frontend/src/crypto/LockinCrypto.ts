export type OutgoingSignupData =
  | {
      ok: true;
      payload: {
        username: string;
        email: string;
        kdfIterations: number;
        aesKeyLength: number;
        gcmIVLength: number;
        errorMessage: string;
      };
    }
  | {
      ok: false;
      payload: {
        errorMessage: string;
      };
    };

export type IncomingSignupData = {

    username: string,
    email: string, 
    password: string

};

export async function handleSignup(data: IncomingSignupData): Promise<OutgoingSignupData> {

    try {

        // Perform KDF and encryption here

        return {
            ok: true,
            payload: {
                username: data.username,
                email: data.email,
                kdfIterations: 100000, // Example value
                aesKeyLength: 256, // Example value
                gcmIVLength: 12, // Example value
                errorMessage: ""
            },
        };

    } catch (e) {
        return {ok: false, payload: { errorMessage: String(e) }};
    }

}