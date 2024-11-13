const CLIENT_ID = '739966027132-j4ngpj7la2hpmkhil8l3d74dpbec1eq1.apps.googleusercontent.com';

export function initAuth() {
    gapi.load('auth2', () => {
        gapi.auth2.init({ client_id: CLIENT_ID }).then(() => {
            const authInstance = gapi.auth2.getAuthInstance();
            authInstance.isSignedIn.listen(updateSigninStatus);
            updateSigninStatus(authInstance.isSignedIn.get());
        });
    });
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        const user = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
        document.getElementById('username').textContent = user.getName();
    } else {
        gapi.auth2.getAuthInstance().signIn();
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    gapi.auth2.getAuthInstance().signOut();
});

initAuth();