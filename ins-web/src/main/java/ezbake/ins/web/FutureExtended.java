package ezbake.ins.web;

import java.io.Serializable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import com.google.common.base.Strings;
import org.slf4j.Logger;

public class FutureExtended<T extends Serializable> {
	final Future<T> future;
	String uid;
	String errors;
	
	public FutureExtended(final Future<T> aFuture) {
		this.future = aFuture;
		this.errors = getErrors();
	}
	
	public FutureExtended(final Future<T> aFuture, final String aUID) {
		this(aFuture);
		setUID(aUID);
	}
	
	public void setUID(String aUID) {
		this.uid = aUID;
	}
	
	public String getUID() {
		return uid;
	}
	
	public boolean isError() {
		return !Strings.isNullOrEmpty(errors);
	}
	
	public String getErrors() {
		return errors;
	}
	
	public Future<T> getFuture() {
		return future;
	}
	
	/**
	 * Run this function at the end of task to set any errors
	 */
	public void setErrors(Logger logger) {
		try {
			if(future.isDone()) { // since get is blocking, we need to make sure task completes first
				future.get();
			} else {
				errors = "";
			}
		} catch (InterruptedException | ExecutionException e) {
			errors = String.format("Errors:%s", e.getMessage());
            logger.error("Async deploy of " + uid + " failed", e);
		}
	}
	
}
