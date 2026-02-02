package com.ydbabatrack

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.media.MediaRecorder
import android.os.Environment
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import android.os.Handler
import android.os.Looper

class PhoneModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var mediaRecorder: MediaRecorder? = null
    private var isRecording = false
    private var currentPhoneState = TelephonyManager.CALL_STATE_IDLE
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String {
        return "PhoneModule"
    }

    private var phoneStateListener: PhoneStateListener? = null

    init {
        mainHandler.post {
            try {
                phoneStateListener = object : PhoneStateListener() {
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        super.onCallStateChanged(state, phoneNumber)
                        // Already on main thread since it was created here, but post to be safe/consistent with logic
                        mainHandler.post {
                            when (state) {
                                TelephonyManager.CALL_STATE_OFFHOOK -> {
                                    // Outgoing or Incoming call connected
                                    if (currentPhoneState == TelephonyManager.CALL_STATE_RINGING ||
                                        currentPhoneState == TelephonyManager.CALL_STATE_IDLE) {
                                        startRecording()
                                    }
                                }
                                TelephonyManager.CALL_STATE_IDLE -> {
                                    // Call ended
                                    if (isRecording) {
                                        stopRecording()
                                    }
                                }
                            }
                            currentPhoneState = state
                        }
                    }
                }
                
                val telephonyManager = reactApplicationContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun startRecording() {
        if (isRecording) return

        try {
            // Use public Downloads or a specific folder if legacy storage is enabled
            // For now, sticking to the requested "ydbabarecord" in external storage
            val baseDir = Environment.getExternalStorageDirectory()
            if (baseDir == null) {
                return
            }
            
            val recordDir = File(baseDir, "ydbabarecord")
            if (!recordDir.exists()) {
                val created = recordDir.mkdirs()
                if (!created && !recordDir.exists()) {
                    // Fallback to internal cache if external fails
                    // val fallbackDir = File(reactApplicationContext.cacheDir, "ydbabarecord")
                    // ...
                    return
                }
            }

            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val fileName = "REC_${timeStamp}.3gp"
            val file = File(recordDir, fileName)

            mediaRecorder = MediaRecorder().apply {
                // MIC is more reliable for 3rd party apps on many devices
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP)
                setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            isRecording = true
        } catch (e: Exception) {
            e.printStackTrace()
            isRecording = false
            mediaRecorder?.release()
            mediaRecorder = null
        }
    }

    private fun stopRecording() {
        if (!isRecording) return
        try {
            mediaRecorder?.apply {
                stop()
                reset()
                release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            mediaRecorder = null
            isRecording = false
        }
    }

    @ReactMethod
    fun getSimCount(promise: Promise) {
        try {
            val subscriptionManager = reactApplicationContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val activeSubscriptionInfoList = subscriptionManager.activeSubscriptionInfoList
            promise.resolve(activeSubscriptionInfoList?.size ?: 0)
        } catch (e: Exception) {
            promise.reject("E_SIM_COUNT", e.message)
        }
    }

    @ReactMethod
    fun getContacts(limit: Int, offset: Int, promise: Promise) {
        try {
            val cr = reactApplicationContext.contentResolver
            val cursor = cr.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                    ContactsContract.CommonDataKinds.Phone.STARRED,
                    ContactsContract.CommonDataKinds.Phone.PHOTO_THUMBNAIL_URI
                ),
                null,
                null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC LIMIT " + limit + " OFFSET " + offset
            )

            val contacts = Arguments.createArray()
            cursor?.use {
                val idIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
                val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                val starredIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.STARRED)
                val photoIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.PHOTO_THUMBNAIL_URI)

                while (it.moveToNext()) {
                    val contact = Arguments.createMap()
                    contact.putString("id", it.getString(idIndex))
                    contact.putString("name", it.getString(nameIndex) ?: "Unknown")
                    contact.putString("number", it.getString(numberIndex))
                    contact.putBoolean("isStarred", it.getInt(starredIndex) == 1)
                    contact.putBoolean("hasThumbnail", it.getString(photoIndex) != null)
                    contacts.pushMap(contact)
                }
            }
            promise.resolve(contacts)
        } catch (e: Exception) {
            promise.reject("E_CONTACTS", e.message)
        }
    }

    @ReactMethod
    fun makeCall(phoneNumber: String, simSlot: Int) {
        val telecomManager = reactApplicationContext.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        val subscriptionManager = reactApplicationContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
        
        try {
            val subscriptions = subscriptionManager.activeSubscriptionInfoList
            val uri = Uri.fromParts("tel", phoneNumber.replace(" ", ""), null)
            val intent = Intent(Intent.ACTION_CALL, uri)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK

            if (subscriptions != null && simSlot < subscriptions.size) {
                val subscriptionInfo = subscriptions[simSlot]
                val phoneAccountHandles = telecomManager.callCapablePhoneAccounts
                
                var selectedHandle: PhoneAccountHandle? = null
                for (handle in phoneAccountHandles) {
                    val account = telecomManager.getPhoneAccount(handle)
                    if (account != null && (account.label.toString().contains(subscriptionInfo.displayName, ignoreCase = true) || 
                        handle.id.contains(subscriptionInfo.subscriptionId.toString()))) {
                        selectedHandle = handle
                        break
                    }
                }

                if (selectedHandle != null) {
                    intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, selectedHandle)
                }
            }
            
            reactApplicationContext.startActivity(intent)
        } catch (e: SecurityException) {
            val uri = Uri.fromParts("tel", phoneNumber, null)
            val intent = Intent(Intent.ACTION_DIAL, uri)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
