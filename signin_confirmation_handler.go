package main

import (
	"crypto/subtle"
	"database/sql"
	"fmt"
	"github.com/gorilla/mux"
	"html/template"
	"net/http"
)

type SigninConfirmationHandler HandlerWithDBConnection

type SigninConfirmationContext struct {
	SigninToken string
	CSRFToken   string
}

func (hd *SigninConfirmationHandler) ServeHTTP(resp http.ResponseWriter, request *http.Request) {
	db := hd.db

	t, err := template.ParseFiles("public/signin_confirmation.html")
	if err != nil {
		fmt.Println("parsing HTML template:", err)
		http.Error(resp, "Internal server error", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(request)
	signinToken := vars["token"]

	if len(signinToken) != signinIdLength+signinSecretLength {
		fmt.Println("invalid length for signin token:", len(signinToken))
		http.Error(resp, "Invalid signin token", http.StatusBadRequest)
		return
	}

	signinId := signinToken[:signinIdLength]
	providedSigninSecret := signinToken[signinIdLength:]

	var signinSecret string
	var csrfToken string
	err = db.QueryRow("select signin_secret, csrf_token from signin_requests where signin_id = ?", signinId).Scan(&signinSecret, &csrfToken)

	if err == sql.ErrNoRows {
		fmt.Printf("no signin request for token: %q\n", signinToken)
		http.Error(resp, "Invalid signin token", http.StatusBadRequest)
		return
	} else if err != nil {
		fmt.Println("retrieving signin token:", err)
		http.Error(resp, "Invalid signin token", http.StatusBadRequest)
		return
	}

	if subtle.ConstantTimeCompare([]byte(providedSigninSecret), []byte(signinSecret)) != 1 {
		fmt.Printf("incorrect signin token: %q\n", signinToken)
		http.Error(resp, "Invalid signin token", http.StatusBadRequest)
		return
	}

	// TODO: needs CSRF token as well
	context := SigninConfirmationContext{
		SigninToken: vars["token"],
		CSRFToken:   csrfToken,
	}

	t.Execute(resp, context)
}